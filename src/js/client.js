"use strict"; /* eslint-env browser */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */

var debug = true,
	userProfile = {}, // The profile of the user
	conversionTable = {0: "a", 1: "b", 2: "c", 3: "d", 4: "e", 5: "f"};

// Navbar Burger
$(document).ready(function () {
	$(".navbar-burger").click(function () {
		$(".navbar-burger").toggleClass("is-active");
		$(".navbar-menu").toggleClass("is-active");
	});
});

// On logout, change DOM
$("#logout").on("click", function() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function () {
		// console.log("User signed out.");
	});
	$(".loginItems").removeClass("is-hidden");
	$("#logout").addClass("is-hidden");
});

// Socket IO Functions
var socket = io.connect();
socket.on("connectionReceived", function connectionReceived () {
	// 
});

// Logout
socket.on("logoutPlease", function () {
	$("#logout").click();
});

// DOM Make the Schedule Table Upon Receiving Sched via Socket.io
socket.on("scheduleModelToClient", function (userData) {
	debug && console.log("Running scheduleModelToClient");
	debug && console.log(userData);
	userProfile.schedule = userData.schedule;
	for (var i = 0; i < userData.schedule.length; i++) {
		for (var j = 0; j < userData.schedule[i].length; j++) {
			if (!userData.schedule[i][j]) {
				// Break!
				// $("td." + conversionTable[i] + "Col.mod" + (j + 1)).css("backgroundColor", "blue");
			}
		}
	}
});

// Socket: Server Sent Back All Your Friends' Schedules
socket.on("SCcompiledFriendScheds", function (serverData) {
	debug && console.log("Running SCcompiledFriendScheds");
	// Loop through the array of friends' schedules, then add it to the DOM if you have that break too
	for (var i = 0; i < serverData.schedules.length; i++) {
		debug && console.log(serverData.schedules[i]);
		for (var m = 0; m < serverData.schedules[i].length; m++) {
			for (var n = 0; n < serverData.schedules[i][m].length; n++) {
				if (!serverData.schedules[i][m][n]) {
					// Break! Great! Now let's see if you, the user, also has that break
					// $("td." + conversionTable[m] + "Col.mod" + (n + 1)).css("backgroundColor", "red");
					if (userProfile.schedule[m][n] === serverData.schedules[i][m][n]) {
						$("td." + conversionTable[m] + "Col.mod" + (n + 1)).css("backgroundColor", "green").text("Jason");
					}
				}
			}
		}
	}
});

// Add User Button Clicked, send message to server
$("#addUserButton").click(function() {
	socket.emit("CSaddUserRequest", {asker: userProfile.punName, requesting: $("#addUserInput").val()});
	$("#addUserInput").val("");
});

// Ask for and receive friend schedules that you are following
$("#monkeypoop").click(function () {
	socket.emit("CSsendMyFriendScheds", {asker: userProfile.punName});
});

// Google Sign-In
function onSignIn (googleUser) {
	// Google Code
	var profile = googleUser.getBasicProfile();
	userProfile.googleProfile = profile;
	userProfile.punName = profile.getEmail().split("@")[0];
	console.log("ID: " + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log("Name: " + profile.getName());
	console.log("Image URL: " + profile.getImageUrl());
	console.log("Email: " + profile.getEmail()); // This is null if the 'email' scope is not present.
	var id_token = googleUser.getAuthResponse().id_token;

	// Our Code
	socket.emit("idToken", {idToken: id_token, username: $("#punahouUsername").val(), password: $("#punahouPassword").val()});
	$("#punahouUsername").val("");
	$("#punahouPassword").val("");
	$(".loginItems").addClass("is-hidden");
	$("#logout").removeClass("is-hidden");
}
