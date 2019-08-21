"use strict"; /* eslint-env browser */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */

// Navbar Burger
$(document).ready(function () {
	$(".navbar-burger").click(function () {
		$(".navbar-burger").toggleClass("is-active");
		$(".navbar-menu").toggleClass("is-active");
	});
});

var socket = io.connect();
socket.on("connectionReceived", function connectionReceived () {
	// 
});

$("#logout").on("click", function() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function () {
	  console.log('User signed out.');
	});
});

// $(".g-signin2").click(function() {
// 	$("#submitPunahouData").click();
// })

function onSignIn(googleUser) {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
	var id_token = googleUser.getAuthResponse().id_token;
	socket.emit("idToken", {idToken: id_token, username: $("#punahouUsername").val(), password: $("#punahouPassword").val()});
	$("#punahouUsername").val("");
	$("#punahouPassword").val("");
}
