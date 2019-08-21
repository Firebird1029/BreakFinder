"use strict"; /* eslint-env node */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */
var debug = false;

/*
 * Notes
 *
 * Resources:
 * https://bulma.io/documentation/
 * https://pugjs.org/api/getting-started.html
 * http://html2jade.vida.io/
 * https://fontawesome.com/icons
 */

// Load Node Dependencies & Custom Modules
var express = require("express"),
	app = express(),
	server = app.listen(process.env.PORT || (process.argv[2] || 8000), function expressServerListening () {
		console.log(server.address());
	}),

	// Express Middleware
	helmet = require("helmet"),
	pugStatic = require("pug-static"),

	// Project-Specific Dependencies
	io = require("socket.io"),
	listener = io.listen(server),
	Nightmare = require("nightmare"),
	nightmare = Nightmare({ show: false }),
	cheerio = require("cheerio"),
	jsonfile = require("jsonfile"),

	// Utilities & Custom Modules
	utils = require("./utils.js");

// Setup Express Middleware
app.set("view engine", "pug");
app.use(helmet());
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/dist"));
app.use(pugStatic(__dirname + "/views"));
app.use((req, res, next) => {
	res.status(404).render("404.pug");
});


function storeUserData(data) {
	jsonfile.readFile("models/data.json", function (err, obj) {
		if (err) console.error(err)
		var newData = JSON.parse(JSON.stringify(obj));
		newData["users"].push(data);
		jsonfile.writeFile("models/data.json", newData, function (err) {
			if (err) console.error(err)
		})
	})
}

// Use cheerio to process schedule data and find breaks
function getDataFromTable(html, val, callback) {
	var data = [[],[],[],[],[],[]];
	const $ = cheerio.load(html);
	for (var i = 1; i < 33; i++) {
		for (var j = 2; j < 8; j++) {
			var currentCell = $("td.screenCell tbody:nth-child(2) tr:nth-child(" + i + ")" + " td:nth-child(" + j + ")");
			/* If there is more than 1 <br> in the <td> then there is a class in that particular cell
			 * Push a 1 into the array if you have a class, a 0 if you don't
			 */
			if (currentCell.children().length > 1) {
				data[j - 2].push(1);
			} else {
				data[j - 2].push(0);
			}
		}
	}
	callback(data);
}

/* Pull student schedule from myBackpack using the username and password to login
 * The studentNum is the student's id number, which is used to select the correct schedule
 */
function getStudentData(username, password, callback) {
	nightmare
		.goto('https://mybackpack.punahou.edu/SeniorApps/facelets/registration/loginCenter.xhtml')
		.wait('body')
		.type('input[id = "form:userId"]', username)
		.type('input[id = "form:userPassword"]', password)
		.click('input[name="form:signIn"]')
		.wait("a[href='https://mybackpack.punahou.edu/SeniorApps/studentParent/schedule.faces?selectedMenuId=true']")
		.click("a[href='https://mybackpack.punahou.edu/SeniorApps/studentParent/schedule.faces?selectedMenuId=true']")
		.wait("select")
		.evaluate(function(){
			for (var i = 0; i < document.querySelector("select").children.length; i++) {
				if (document.querySelector("select").children[i].innerHTML == "Punahou Academy") {
					return document.querySelector("select").children[i].value;
				}
			}
		})
		.then(value => {
			nightmare
				.wait(500)
				.select('select', value)
				.wait(2000)
				.evaluate(function(){
					if (document.querySelector("input.chartButtonUp") === null) {
						return false;
					} else {
						return true;
					}
				})
				.then(inputExists => {
					if (inputExists) {
						nightmare
							.wait("input.chartButtonUp")
							.click("input.chartButtonUp")
					}
					nightmare
						.wait(5000)
						.evaluate(() => document.body.innerHTML)
						.then(response => {
							getDataFromTable(response, value, function(data) {
								console.log(data);
								nightmare.end();
								callback(data);
							});
							
						})
						.catch(error => {
							console.error('Error:', error);
						})
				})
				.catch(error => {
					console.error('Error:', error);
				})
		})
		.catch(error => {
			console.error('Search failed:', error);
			// Failed login or something wrong
		})
}

// For testing


// var router = require("./routes/routes.js");
// app.use("/", router);

// Socket.io Control
listener.sockets.on("connection", function connectionDetected (socket) {
	socket.on("refreshRequest", function processRefreshRequest (options) {
		socket.emit("refreshResponse", {});
	});
	socket.on("idToken", function processGoogleIDToken (options) {
		const {OAuth2Client} = require('google-auth-library');
		const client = new OAuth2Client("831400703769-dgio9hsp0mh3hmndc4rg1ljaakusbolu.apps.googleusercontent.com"); // "831400703769-dgio9hsp0mh3hmndc4rg1ljaakusbolu"
		var userid;
		async function verify() {
		  const ticket = await client.verifyIdToken({
		      idToken: options.idToken,
		      audience: "831400703769-dgio9hsp0mh3hmndc4rg1ljaakusbolu.apps.googleusercontent.com",  // Specify the CLIENT_ID of the app that accesses the backend
		      // Or, if multiple clients access the backend:
		      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
		  });
		  const payload = ticket.getPayload();
		  userid = payload['sub'];
		  console.log(payload);
		  // If request specified a G Suite domain:
		  //const domain = payload['hd'];
		  getStudentData(options.username, options.password, function(studentData) {
		  	 storeUserData({"user":payload['sub'], "schedule":studentData})
		  });
		}
		verify().catch(console.error);
	});
});
