"use strict"; /* eslint-env browser */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */

// Navbar Burger
$(document).ready(function () {
	$(".navbar-burger").click(function () {
		$(".navbar-burger").toggleClass("is-active");
		$(".navbar-menu").toggleClass("is-active");
	});
});

// Socket IO Functions
var socket = io.connect();
socket.on("connectionReceived", function connectionReceived () {
	// 
});

socket.on("logoutPlease", function () {
	$("#logout").click();
});

socket.on("scheduleModelToClient", function (userData) {
	var conversionTable = {0: "a", 1: "b", 2: "c", 3: "d", 4: "e", 5: "f"};
	console.log(userData);
	for (var i = 0; i < userData.schedule.length; i++) {
		for (var j = 0; j < userData.schedule[i].length; j++) {
			if (!userData.schedule[i][j]) {
				// Break!
				$("td." + conversionTable[i] + "Col.mod" + (j + 1)).css("backgroundColor", "blue");
			}
		}
	}
});

$("#addUserButton").click(function() {
	socket.emit("addUserRequest", $("#addUser").val());
	$("#addUser").val("");
});

$("#logout").on("click", function() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function () {
		// console.log("User signed out.");
	});
	$(".loginItems").removeClass("is-hidden");
	$("#logout").addClass("is-hidden");
});

// $(".g-signin2").click(function() {
// 	$("#submitPunahouData").click();
// })

// Google Sign-In
function onSignIn (googleUser) {
	// Google Code
	var profile = googleUser.getBasicProfile();
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
