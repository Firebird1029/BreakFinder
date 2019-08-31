"use strict"; /* eslint-env browser */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */

var debug = true,
	userProfile = {}, // The profile of the user
	conversionTable = {0: "a", 1: "b", 2: "c", 3: "d", 4: "e", 5: "f"},
	masterSched = [[[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []]];

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
socket.on("S2CsendBasicUserData", function (userData) {
	debug && console.log("Running S2CsendBasicUserData");
	// TODO -- why so much back & forth
	socket.emit("C2SsendMyFriendScheds", {asker: userProfile.punName});
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
socket.on("S2CcompiledFriendScheds", function (serverData) {
	debug && console.log("Running SCcompiledFriendScheds");
	// Loop through the array of friends' schedules, then add it to the DOM if you have that break too
	for (var i = 0; i < serverData.schedules.length; i++) {
		// debug && console.log(serverData.schedules[i]);
		for (var m = 0; m < serverData.schedules[i].schedule.length; m++) {
			for (var n = 0; n < serverData.schedules[i].schedule[m].length; n++) {
				if (!serverData.schedules[i].schedule[m][n]) {
					// Break! Great! Now let's see if you, the user, also has that break
					// $("td." + conversionTable[m] + "Col.mod" + (n + 1)).css("backgroundColor", "red");
					if (userProfile.schedule[m][n] === serverData.schedules[i].schedule[m][n]) {
						//$("td." + conversionTable[m] + "Col.mod" + (n + 1)).css("backgroundColor", "green").text("Jason");
						console.log(m, n);
						console.log(masterSched);
						console.log(masterSched[m][n]);
						// var scheduleCell = {color: "green", text:}
						console.log(serverData.schedules[i].fname);
						masterSched[m][n].push(serverData.schedules[i].fname)
					}
				}
			}
		}
	}
	displayMasterSched();
});

// Socket: Server Sent Back Your Follow Requests (the people who want to follow your schedule)
socket.on("S2CfollowRequests", function (serverData) {
	debug && console.log("Running S2CfollowRequests");
	var $temp;
	// Loop through the array of friends' schedules, then add it to the DOM if you have that break too
	for (var i = 0; i < serverData.followRequests.length; i++) {
		$temp = $("#followRequestTableRowTemplate").clone().removeClass("is-hidden");
		$temp.data("followRequestName", serverData.followRequests[i]);
		$temp.find("th").text(serverData.followRequests[i]);
		$("#followRequestTableBody").append($temp);
	}
});

// Add User Button Clicked, send message to server
$("#addUserButton").click(function() {
	socket.emit("C2SaddUserRequest", {asker: userProfile.punName, requesting: $("#addUserInput").val()});
	$("#addUserInput").val("");
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

	// Socket Code
	var nameArray = profile.getName().split(" ");
	socket.emit("idToken", {idToken: id_token, username: $("#punahouUsername").val(), password: $("#punahouPassword").val(), fname: nameArray[0], lname: nameArray[nameArray.length - 1]});
	$("#punahouUsername").val("");
	$("#punahouPassword").val("");

	// Show Our App!
	$(".initiallyHidden").removeClass("is-invisible");
	$("#loginSection").addClass("is-hidden");
}

function displayMasterSched() {
	for (var i = 0; i < masterSched.length; i++) {
		for (var j = 0; j < masterSched[i].length; j++) {
			if (masterSched[i][j].length > 0) {
				var text = "";
				for (var k = 0; k < masterSched[i][j].length; k++) {
					text = text + " " + masterSched[i][j][k]
				}
				$("td." + conversionTable[i] + "Col.mod" + (j + 1)).css("backgroundColor", "green").text(text);
			}
		}
	}
}
