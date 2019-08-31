"use strict"; /* eslint-env node */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */
var debug = true;

/*
 * Notes
 *
 * TODO
 * Make code async -- so 2 ppl can run at same time
 * Make loading symbol for after they type in password and waiting for nightmare
 * Comment EVERYTHING
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
	nightmare = Nightmare({show: false}),
	cheerio = require("cheerio"),
	jsonfile = require("jsonfile"),

	// Utilities & Custom Modules
	_ = require("lodash"),
	utils = require("./utils.js");

// Google Packages & Keys
const {OAuth2Client} = require("google-auth-library");
const secretGoogleKey = "831400703769-dgio9hsp0mh3hmndc4rg1ljaakusbolu.apps.googleusercontent.com";
const client = new OAuth2Client(secretGoogleKey);

// Setup Express Middleware
app.set("view engine", "pug");
app.use(helmet());
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/dist"));
app.use(pugStatic(__dirname + "/views"));
app.use((req, res, next) => {
	res.status(404).render("404.pug");
});

// var router = require("./routes/routes.js");
// app.use("/", router);

// Model Functions -- User Data
function storeUserData (data, callback) {
	jsonfile.readFile("models/data.json", function (err, obj) {
		if (err) console.error(err);
		var newData = JSON.parse(JSON.stringify(obj));
		if (!_.find(newData.users, {user: data.user})) {
			// User doesn't exist yet
			debug && console.log("Creating new user");
			newData.users.push(data);
			jsonfile.writeFile("models/data.json", newData, function (err) {
				if (err) console.error(err);
				callback();
			});
		} else {
			callback();
		}
	});
}
function getUserData (userToGet, callback) {
	jsonfile.readFile("models/data.json", function (err, obj) {
		if (err) console.error(err);
		var user = _.find(obj.users, {user: userToGet});
		callback(user);
	});
}
function getUserDataByPunName (punName, callback) {
	jsonfile.readFile("models/data.json", function (err, obj) {
		if (err) console.error(err);
		var user = _.find(obj.users, {punName: punName});
		callback(user);
	});
}
function editUserDataByPunName (punName, data, callback) {
	jsonfile.readFile("models/data.json", function (err, obj) {
		if (err) console.error(err);
		var newData = JSON.parse(JSON.stringify(obj));
		if (_.find(newData.users, {punName: punName})) {
			debug && console.log("Editing user: " + punName);
			 newData.users[_.findIndex(newData.users, {punName: punName})]= _.assign(newData.users[_.findIndex(newData.users, {punName: punName})], data);
			
			jsonfile.writeFile("models/data.json", newData, function (err) {
				if (err) console.error(err);
				debug && console.log("Finished editing user: " + punName);
				callback();
			});
		} else {
			callback();
			// TODO: Deal with when account isn't existing -- this means I typed jtay02 instead of jtay20
		}
	});
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

function extractDataFromTable(callback) {
	nightmare
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
				.wait(1000)
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
								debug && console.log(data);
								nightmare.end();
								callback(data);
							});
							
						})
						.catch(error => {
							console.error("Error: ", error);
						})
				})
				.catch(error => {
					console.error("Error: ", error);
				})
			})
}

/* Pull student schedule from myBackpack using the username and password to login
 * The studentNum is the student's id number, which is used to select the correct schedule
*/
function getStudentData (username, password, callback) {
	nightmare = Nightmare({show: false});
	nightmare
		.goto('https://mybackpack.punahou.edu/SeniorApps/facelets/registration/loginCenter.xhtml')
		.wait('body')
		.type('input[id = "form:userId"]', username)
		.type('input[id = "form:userPassword"]', password)
		.click('input[name="form:signIn"]')
		.wait(2000)
		.evaluate(function() {
			if (document.getElementById("form:errorMsgs") == null) {
				return true;
			} else {
				return false;
			}
		})
		.then(loggedIn => {
			if (loggedIn) {
				extractDataFromTable(callback);
			} else {
				// Failed login
				callback("failedLogin");
			}
			
		})
		.catch(error => {
			console.error("Error: ", error);
		});
}

// User Manipulation Functions
function compileFriendScheds (punName, callback) {
	// Who are your friends? Let's look in your user object and find out, so we can loop through them and pull the scheds!
	var compileFriendScheds = [];
	getUserDataByPunName(punName, function (userObject) {
		utils.waterfallOverArray(userObject.following, function (currentFriend, report) {
			// So these are your friends, one by one. Let's look inside THEIR user object and record their schedule.
			getUserDataByPunName(currentFriend, function (friendUserObject) {
				if (friendUserObject) {
					debug && console.log(friendUserObject);
					compileFriendScheds.push(friendUserObject);
					report();
				}
			});
		}, function () {
			// Done looping through your following array. Call back with the array of all your friends' schedules.
			callback(compileFriendScheds);
		});
	});
}
function acceptFollowRequest (punName, callback) {
	// Who are your friends? Let's look in your user object and find out, so we can loop through them and pull the scheds!
	var compileFriendScheds = [];
	getUserDataByPunName(punName, function (userObject) {
		utils.waterfallOverArray(userObject.following, function (currentFriend, report) {
			// So these are your friends, one by one. Let's look inside THEIR user object and record their schedule.
			getUserDataByPunName(currentFriend, function (friendUserObject) {
				compileFriendScheds.push(friendUserObject.schedule);
				report();
			});
		}, function () {
			// Done looping through your following array. Call back with the array of all your friends' schedules.
			callback(compileFriendScheds);
		});
	});
}

// Socket.io Control
listener.sockets.on("connection", function connectionDetected (socket) {
	socket.on("refreshRequest", function processRefreshRequest (options) {
		socket.emit("refreshResponse", {});
	});

	// Add User Request
	socket.on("C2SaddUserRequest", function addUser (request) {
		debug && console.log("Running CSaddUserRequest");
		// Add follow request function TODO -- so I can follow multiple people
		editUserDataByPunName(request.requesting, {followRequests: [request.asker]}, function () {
			socket.emit("SCaddUserRequestSccessful", {originalRequest: request});
		});
	});

	// Send Back All Schedules You're Following
	socket.on("C2SsendMyFriendScheds", function sendFriendSchedsToClient (request) {
		debug && console.log("Running CSsendMyFriendScheds");
		console.log(request)
		compileFriendScheds(request.asker, function (schedulesArray) {
			socket.emit("S2CcompiledFriendScheds", {schedules: schedulesArray});
		});
		getUserDataByPunName(request.asker, function (userObject) {
			socket.emit("S2CfollowRequests", {followRequests: userObject.followRequests});
		});
	});

	socket.on("nightmareLogin", function myBackpackLogin (request) {
		getStudentData(request.username, request.password, function(studentData) {
			if (studentData == "failedLogin") {
				socket.emit("failedLogin");
			} else {
				console.log(studentData);
				socket.emit("successfulLogin", studentData);
			}
		})
	});

	// Google Sign-In
	socket.on("idToken", function processGoogleIDToken (options) {
		var userid;
		async function verify () {
			const ticket = await client.verifyIdToken({
				idToken: options.idToken,
				audience: secretGoogleKey,	// Specify the CLIENT_ID of the app that accesses the backend
				// Or, if multiple clients access the backend:
				//[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
			});
			const payload = ticket.getPayload();
			userid = payload["sub"];
			// debug && console.log(payload);
			// If request specified a G Suite domain:
			//const domain = payload['hd'];
			
			// After Google Verification Process
			if (options.username && options.password) {
				// TODO: Move this to client-side code
				// TODO: run nightmare for new users only
				// Username & password both exist --> new user (although username/password might be wrong)
				
				 storeUserData({user: payload.sub, punName: payload.email.substr(0, payload.email.indexOf("@")), schedule: options.nightmareData, following: [], followRequests: [], fname: options.fname, lname: options.lname}, function () {
				 	getUserData(payload.sub, function (userData) {
							socket.emit("S2CsendBasicUserData", userData);
						});
				 });

			} else {
				// Username and/or password missing --> check if user exists or not
				getUserData(payload.sub, function (userData) {
					if (userData) {
						// User exists, so send back their schedule
						socket.emit("S2CsendBasicUserData", userData);
					} else {
						// User doesn't exist, so log them back out >:(
						debug && console.log("User doesn't exist, logging out");
						socket.emit("logoutPlease");
					}
				});
			}
		}
		verify().catch(console.error);
	});
});
