"use strict"; /* eslint-env node */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */
var debug = true;

/*
 * Notes
 *
 * TODO
 * When you have no friends yet, show message to add friends
 * Comment EVERYTHING
 * Find all function () and change to named functions
 * If Google and username don't match after Google login
 * https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04
 * https://www.digitalocean.com/community/tutorials/how-to-point-to-digitalocean-nameservers-from-common-domain-registrars
 * https://www.digitalocean.com/community/tutorials/how-to-set-up-let-s-encrypt-with-nginx-server-blocks-on-ubuntu-16-04
 * 		https://www.digitalocean.com/community/tutorials/how-to-set-up-nginx-server-blocks-virtual-hosts-on-ubuntu-16-04
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
			var userIndex = _.findIndex(newData.users, {punName: punName});
			newData.users[userIndex]= _.assign(newData.users[userIndex], data);
			
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
function editUserDataByPunNameArray (punName, command, arrayName, data, callback) {
	jsonfile.readFile("models/data.json", function (err, obj) {
		if (err) console.error(err);
		var newData = JSON.parse(JSON.stringify(obj));
		if (_.find(newData.users, {punName: punName})) {
			debug && console.log("Editing user: " + punName);
			var userIndex = _.findIndex(newData.users, {punName: punName});
			if (command === "push") {
				if (newData.users[userIndex][arrayName].indexOf(data) < 0) {
					// Does not yet exist in array, so add it
					newData.users[userIndex][arrayName].push(data);
				}
			}
			if (command === "_remove") {
				// Will not remove it if it doesn't exist automatically
				_.remove(newData.users[userIndex][arrayName], function (n) {
					return n === data;
				});
			}
			
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
				var text = currentCell.html()
				data[j - 2].push(text.split("<")[0].substring(text.indexOf(' ')+1));
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
								// debug && console.log(data);
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
function getStudentDataViaNightmare (username, password, callback) {
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
	debug && console.log("Running compileFriendScheds", punName);
	// Who are your friends? Let's look in your user object and find out, so we can loop through them and pull the scheds!
	var compileFriendScheds = [];
	getUserDataByPunName(punName, function (userObject) {
		if (userObject.following.length) {
			// You are following your friends' schedules!
			utils.waterfallOverArray(userObject.following, function (currentFriend, report) {
				// So these are your friends, one by one. Let's look inside THEIR user object and record their schedule.
				getUserDataByPunName(currentFriend, function (friendUserObject) {
					if (friendUserObject) {
						compileFriendScheds.push(friendUserObject);
						report();
					}
				});
			}, function () {
				// Done looping through your following array. Call back with the array of all your friends' schedules.
				callback(compileFriendScheds);
			});
		} else {
			// You are not following anyone yet!
			callback(compileFriendScheds); // If userObject.following is empty, utils.waterfall will not run.
		}
	});
}

// Socket.io Control
listener.sockets.on("connection", function connectionDetected (socket) {
	socket.on("refreshRequest", function processRefreshRequest (options) {
		socket.emit("refreshResponse", {});
	});

	// Send Back Friend Scheds & Follow Requests
	function sendAllDataRefresh (request) {
		compileFriendScheds(request.asker, function (usersArray) {
			socket.emit("S2CcompiledFriendScheds", {users: usersArray});
			console.log("Sent compiled friend schedules.")
		});
		getUserDataByPunName(request.asker, function (userObject) {
			// TODO - minor - switch from jtay20 requesting to view sched to Jason Tay requesting to view sched
			socket.emit("S2CfollowRequests", {followRequests: userObject.followRequests});
			console.log("Sent follow requests.")
		});
	}

	// Add User Request
	socket.on("C2SaddUserRequest", function addUser (request) {
		debug && console.log("Running CSaddUserRequest", request);
		getUserDataByPunName(request.requesting, function (userObject) {
			if (userObject) {
				// User exists. First, check if you are already following that user. If not, add to requested user's followRequests array.
				getUserDataByPunName(request.asker, function (userObject) {
					if (userObject.following.indexOf(request.requesting) > -1 || request.asker === request.requesting) {
						// You are already following that user! Or you are requesting yourself.
						socket.emit("S2CaddUserRequestFailed", {originalRequest: request, message: "You are already following that user!"});
					} else {
						editUserDataByPunNameArray(request.requesting, "push", "followRequests", request.asker, function () {
							socket.emit("S2CaddUserRequestSuccessful", {originalRequest: request});
						});
					}
				})				
			} else {
				// User doesn't exist. Notify on client-side that they don't exist.
				socket.emit("S2CaddUserRequestFailed", {originalRequest: request, message: "User doesn't exist yet. Ask them to make an account!"});
			}
		});
	});

	// Accept User Follow Request
	socket.on("C2SacceptFollowRequest", function acceptFollowRequest (request) {
		debug && console.log("Running C2SacceptFollowRequest", request);
		editUserDataByPunNameArray(request.requestGrantedFor, "push", "following", request.requestGrantedBy, function () {
			editUserDataByPunNameArray(request.requestGrantedBy, "_remove", "followRequests", request.requestGrantedFor, function () {
				socket.emit("S2CacceptFollowRequestSuccessful", request);
			});
		});
	});

	// Reject User Follow Request
	socket.on("C2SrejectFollowRequest", function rejectFollowRequest (request) {
		debug && console.log("Running C2SrejectFollowRequest", request);
		editUserDataByPunNameArray(request.requestRejectedBy, "_remove", "followRequests", request.requestRejectedFor, function () {
			socket.emit("S2CrejectFollowRequestSuccessful", request);
		});
	});

	// Remove A Friend (Stop Following Your Friend's Schedule)
	socket.on("C2SremoveMyFriendRequest", function removeMyFriendRequest (request) {
		debug && console.log("Running C2SremoveMyFriendRequest", request);
		editUserDataByPunNameArray(request.asker, "_remove", "following", request.requestToRemove, function () {
			socket.emit("S2CremoveMyFriendRequestSuccessful", request);
			// sendAllDataRefresh(request);
		});
	});

	// Send Back All Schedules You're Following
	socket.on("C2SsendMyFriendScheds", function sendFriendSchedsToClient (request) {
		debug && console.log("Running C2SsendMyFriendScheds", request);
		compileFriendScheds(request.asker, function (usersArray) {
			socket.emit("S2CcompiledFriendScheds", {users: usersArray});
		});
	});
	socket.on("C2SsendMyFollowRequests", function sendMyFollowRequests (request) {
		getUserDataByPunName(request.asker, function (userObject) {
			// TODO - minor - switch from jtay20 requesting to view sched to Jason Tay requesting to view sched
			socket.emit("S2CfollowRequests", {followRequests: userObject.followRequests});
		});
	});

	socket.on("nightmareLogin", function myBackpackLogin (request) {
		debug && console.log("Running nightmareLogin", request);
		getStudentDataViaNightmare(request.username, request.password, function(studentData) {
			if (studentData === "failedLogin") {
				// Login failed -- username & password don't match
				debug && console.log("Nightmare login failed.");
				socket.emit("failedLogin");
			} else {
				// Login successful -- pulled schedule
				debug && console.log("Nightmare login successful!");
				socket.emit("successfulLogin", studentData);
			}
		})
	});

	// Login Functions
	socket.on("loginCheckIfUserExists", function loginCheckIfUserExists (request) {
		debug && console.log("Running loginCheckIfUserExists", request);
		getUserDataByPunName(request.punName, function (userObject) {
			if (userObject) {
				// User exists in data.json, returning user
				socket.emit("loginUserExists");
			} else {
				// User doesn't exist in data.json, new user
				socket.emit("loginUserDoesNotExist");
			}
		});
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
			if (options.username != payload.email.split("@")[0]) {
				// Username and Google Account mismatch
				socket.emit("accountMismatch");
			} else {
				// After Google Verification Process
				if (options.username && options.password) {
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
		}
		verify().catch(console.error);
	});
});
