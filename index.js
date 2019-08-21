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
	mongo = require("mongodb"),
	MongoClient = mongo.MongoClient,

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
					audience: "831400703769-dgio9hsp0mh3hmndc4rg1ljaakusbolu.apps.googleusercontent.com",	// Specify the CLIENT_ID of the app that accesses the backend
					// Or, if multiple clients access the backend:
					//[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
			});
			const payload = ticket.getPayload();
			userid = payload['sub'];
			console.log(payload);
			// If request specified a G Suite domain:
			//const domain = payload['hd'];
		}
		verify().catch(console.error);
	});
});

// MongoDB
var mongoUrl = "mongodb://localhost:27017/";
MongoClient.connect(mongoUrl, function(err, db) {
	if (err) throw err;
	console.log("Database created!");
	var dbo = db.db("mydb");
	dbo.createCollection("customers", function (err, res) {
		if (err) throw err;
		console.log("Collection created!");
		db.close();
	});
});
