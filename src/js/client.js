"use strict"; /* eslint-env browser */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */

$.fn.extend({
	animateCss: function(animationName, callback) {
		var animationEnd = (function(el) {
			var animations = {
				animation: "animationend",
				OAnimation: "oAnimationEnd",
				MozAnimation: "mozAnimationEnd",
				WebkitAnimation: "webkitAnimationEnd",
			};

			for (var t in animations) {
				if (el.style[t] !== undefined) {
					return animations[t];
				}
			}
		})(document.createElement("div"));

		this.addClass("animated " + animationName).one(animationEnd, function() { 
			$(this).removeClass("animated " + animationName);

			if (typeof callback === "function") callback();
		});
	
		return this;
	},
});

var debug = true,
	loggedIn = false,
	userProfile = {}, // The profile of the user
	ignoreFriendScheds = [], // Hide users to display
	conversionTable = {0: "a", 1: "b", 2: "c", 3: "d", 4: "e", 5: "f"},
	masterSchedLayout = [[[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
				   [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []]];

var masterSched = _.cloneDeep(masterSchedLayout); // To reset masterSched quickly.

// Navbar Burger
$(document).ready(function () {
	$(".navbar-burger").click(function () {
		$(".navbar-burger").toggleClass("is-active");
		$(".navbar-menu").toggleClass("is-active");
	});
});

// Tippies
var tippyInstances;
function createTippies () {
	tippyInstances = tippy(".schedMod", {
		placement: "left",
		theme: "punahou",
		followCursor: "vertical",
		content: ""
	});
	tippy.group(tippyInstances, {
		delay: [200, 100] // if the instances don't specify a `delay`
	});
}

// On logout, change DOM
$("#logout").on("click", function() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function () {
		debug && console.log("User signed out.");
		window.location.reload();
	});
});

// Reset Master Schedule DOM
function resetMasterSched () {
	for (var i = 0; i < masterSched.length; i++) {
		for (var j = 0; j < masterSched[i].length; j++) {
			$("td." + conversionTable[i] + "Col.mod" + (j + 1)).css("backgroundColor", "").text("");
			tippyInstances[i+(6*j)].disable();
		}
	}
}

// Display Master Sched
function displayMasterSched () {
	resetMasterSched();
	var highestFriendCount = getHighestFriendCount();
	var text, numberOfFriendsOnBreak, listOfFriends = [];
	for (var i = 0; i < masterSched.length; i++) {
		for (var j = 0; j < masterSched[i].length; j++) {
			numberOfFriendsOnBreak = 0;
			if (masterSched[i][j].length > 0) {
				// You have friends on this break!
				text = ""; listOfFriends = [];
				for (var k = 0; k < masterSched[i][j].length; k++) {
					// These are each friend during this specific break.
					if (ignoreFriendScheds.indexOf(masterSched[i][j][k].punName) < 0) {
						// Show this user to display, since it does not exist in the ignoreFriendScheds array
						text = text + ", " + masterSched[i][j][k].fname;
						listOfFriends.push(masterSched[i][j][k].fname + " " + masterSched[i][j][k].lname);
						numberOfFriendsOnBreak++;
					}
				}

				// Color of Mod
				$("td." + conversionTable[i] + "Col.mod" + (j + 1)).data("backgroundColorAlpha", ((0.7*(numberOfFriendsOnBreak / highestFriendCount))+0.3));

				if (numberOfFriendsOnBreak > 0) {
					// .text(text) or .text("" + numberOfFriendsOnBreak + " friends")
					text = text.substring(2);
					$("td." + conversionTable[i] + "Col.mod" + (j + 1)).text(text);
					// https://stackoverflow.com/questions/2151084/map-a-2d-array-onto-a-1d-array
					tippyInstances[i+(6*j)].setContent(listOfFriends.join("<br>"));
					tippyInstances[i+(6*j)].enable();
				}
			}
		}
	}
	animateMasterSched();
}

// Animation Setup: Get Most Amount of Friends In Break At Once
function getHighestFriendCount () {
	var highestFriendCount = 0;
	for (var i = 0; i < masterSched.length; i++) {
		for (var j = 0; j < masterSched[i].length; j++) {
			if (masterSched[i][j].length > highestFriendCount) {
				highestFriendCount = masterSched[i][j].length;
			}
		}
	}
	return highestFriendCount;
}

// Animation For Master Sched
function animateMasterSched () {
	var alphaColor;
	for (var i = 0; i < masterSched.length; i++) {
		for (var j = 0; j < masterSched[i].length; j++) {
			alphaColor = $("td." + conversionTable[i] + "Col.mod" + (j + 1)).data("backgroundColorAlpha");
			// If no friends on this break, don't color the mod block
			if (!$("td." + conversionTable[i] + "Col.mod" + (j + 1)).text().length) { alphaColor = 0 }
			// $("td." + conversionTable[i] + "Col.mod" + (j + 1)).animate({backgroundColor: "rgba(227, 182, 14, " + alphaColor + ")"})
			$("td." + conversionTable[i] + "Col.mod" + (j + 1)).css("backgroundColor", "rgba(227, 182, 14, " + alphaColor + ")");
		}
	}
	// backgroundColorAlpha
}

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
	socket.emit("C2SsendMyFollowRequests", {asker: userProfile.punName});
	// debug && console.log(userData);
	userProfile.schedule = userData.schedule;
	/*for (var i = 0; i < userData.schedule.length; i++) {
		for (var j = 0; j < userData.schedule[i].length; j++) {
			if (!userData.schedule[i][j]) {
				// Break!
				// $("td." + conversionTable[i] + "Col.mod" + (j + 1)).css("backgroundColor", "blue");
			}
		}
	}*/
});

// Socket: Server Sent Back All Your Friends' Schedules
socket.on("S2CcompiledFriendScheds", function (serverData) {
	debug && console.log("Running SCcompiledFriendScheds");
	$("#friendsListTableBody").children().not("tr:first").remove();
	var $temp;
	// Loop through the array of friends' schedules, then add their name to master schedule if you have that break too
	masterSched = _.cloneDeep(masterSchedLayout); // IMPORTANT! Reset masterSched
	for (var i = 0; i < serverData.users.length; i++) {
		// debug && console.log(serverData.users[i]);
		// Add Friend i to Sidebar
		$temp = $("#friendsListTableRowTemplate").clone().removeClass("is-hidden").removeAttr("id");;
		$temp.data("friendName", serverData.users[i].punName);
		$temp.find(".friendsListDynamic").data("friendName", serverData.users[i].punName);
		$temp.find(".friendsListChangeDisplay").bind("click", bindFriendsListChangeDisplay);
		$temp.find(".removeFriendDynamic").bind("click", bindRemoveFriendDynamic);

		$temp.find("td.friendsListFriendName").text(serverData.users[i].fname + " " + serverData.users[i].lname);
		$("#friendsListTableBody").append($temp);

		// Friend i's schedule array
		for (var m = 0; m < serverData.users[i].schedule.length; m++) {
			for (var n = 0; n < serverData.users[i].schedule[m].length; n++) {
				if (!serverData.users[i].schedule[m][n]) {
					// Break! Great! Now let's see if you, the user, also has that break
					// $("td." + conversionTable[m] + "Col.mod" + (n + 1)).css("backgroundColor", "red");
					if (userProfile.schedule[m][n] === serverData.users[i].schedule[m][n]) {
						//$("td." + conversionTable[m] + "Col.mod" + (n + 1)).css("backgroundColor", "green").text("Jason");
						masterSched[m][n].push({punName: serverData.users[i].punName, fname: serverData.users[i].fname, lname: serverData.users[i].lname})
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
	$("#followRequestTableBody").children().not("tr:first").remove();
	var $temp;

	if (serverData.followRequests.length) {
		// You have follow requests!
		$("#followRequestsDiv").removeClass("is-hidden");
		for (var i = 0; i < serverData.followRequests.length; i++) {
			$temp = $("#followRequestTableRowTemplate").clone().removeClass("is-hidden").removeAttr("id");;
			$temp.data("followRequestName", serverData.followRequests[i]);
			$temp.find(".followRequestDynamic").data("followRequestName", serverData.followRequests[i]);
			$temp.find(".acceptFollowRequestDynamic").bind("click", bindFollowRequestAcceptClick);
			$temp.find(".rejectFollowRequestDynamic").bind("click", bindFollowRequestRejectClick);

			$temp.find("th").text(serverData.followRequests[i]);
			$("#followRequestTableBody").append($temp);
		}
	}
});

// Socket: When Friend is Removed, Send Back a Request to Update Friend Schedule
socket.on("S2CremoveMyFriendRequestSuccessful", function () {
	socket.emit("C2SsendMyFriendScheds", {asker: userProfile.punName});
});

// Add User Button Clicked, send message to server
$("#addUserButton").click(function() {
	socket.emit("C2SaddUserRequest", {asker: userProfile.punName, requesting: $("#addUserInput").val()});
	$("#addUserInput").val("");
});

// Accept Follow Request Clicked, send message to server
function bindFollowRequestAcceptClick () {
	socket.emit("C2SacceptFollowRequest", {requestGrantedFor: $(this).data("followRequestName"), requestGrantedBy: userProfile.punName});
	$(this).closest("tr").remove();
}

// Reject Follow Request Clicked
function bindFollowRequestRejectClick () {
	socket.emit("C2SrejectFollowRequest", {requestRejectedFor: $(this).data("followRequestName"), requestRejectedBy: userProfile.punName});
	$(this).closest("tr").remove();
}

// Change Display of Friend
function bindFriendsListChangeDisplay () {
	// Client side only
	var friendName = $(this).data("friendName");
	if ($(this).prop("checked")) {
		// User just checked display ON
		if (ignoreFriendScheds.indexOf(friendName) > -1) {
			ignoreFriendScheds.splice(ignoreFriendScheds.indexOf(friendName), 1);
		}
	} else {
		// User just checked display OFF
		if (ignoreFriendScheds.indexOf(friendName) < 0) {
			ignoreFriendScheds.push(friendName);
		}
	}
	displayMasterSched();
}

// Remove Friend That You Are Following (Stop Following Their Schedule)
function bindRemoveFriendDynamic () {
	socket.emit("C2SremoveMyFriendRequest", {asker: userProfile.punName, requestToRemove: $(this).data("friendName")});
	$(this).closest("tr").remove();
}

// Google Sign-In
function onSignIn (googleUser) {
	loggedIn = true;
	$("#pageLoaded").addClass("is-hidden");

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
	socket.emit("idToken", {idToken: id_token, username: $("#punahouUsername").val(), password: $("#punahouPassword").val(), fname: nameArray[0], lname: nameArray[nameArray.length - 1], nightmareData: userProfile.nightmareData});
	$("#punahouUsername").val("");
	$("#punahouPassword").val("");

	// Show Our App!
	$(".initiallyHidden").removeClass("is-hidden");
	$("#loginSection").addClass("is-hidden");
	$("footer.footer").removeClass("is-hidden");
	createTippies();
}

// Login Code
var $punUsername = $("#punahouUsername"),
	$punPassword = $("#punahouPassword"),
	$punNewAccBtn = $("#punahouCreateAccount"),
	$gSignin = $(".g-signin2");

setTimeout(function () {
	if (!loggedIn) {
		$(".startLoginField").animateCss("fadeIn").removeClass("is-invisible");
	}
	$("#pageLoaded").addClass("is-hidden");
}, 1500);

$punUsername.on("keyup", function (event) {
	if(event.which === 13 || event.keyCode === 13) {
		$punUsername.attr("disabled", true);
		socket.emit("loginCheckIfUserExists", {punName: $punUsername.val()});
		$("#usernameCheckLoading").removeClass("is-invisible");
	}
});
$punPassword.on("keyup", function (event) {
	if(event.which === 13 || event.keyCode === 13) {
		$punNewAccBtn.click();
	}
});

socket.on("loginUserExists", function () {
	// Show Google Sign-In Button
	$("#usernameCheckLoading").addClass("is-invisible");
	$("#loginTopSection").animateCss("fadeOut", function () {
		$("#loginTopSection").addClass("is-hidden");
		$("#welcomeBackMsg").animateCss("fadeIn").removeClass("is-invisible");
		$gSignin.animateCss("fadeIn").removeClass("is-invisible");
	});
});

socket.on("loginUserDoesNotExist", function () {
	$("#usernameCheckLoading").addClass("is-invisible");
	$punPassword.animateCss("fadeIn").removeClass("is-invisible");
	$punNewAccBtn.animateCss("fadeIn").removeClass("is-invisible");
});

$punNewAccBtn.click(function () {
	$("#failMessage").addClass("is-invisible");
	$("#punahouUsername, #punahouPassword, #punahouCreateAccount").attr("disabled", true);
	// $punPassword.attr("disabled", true);
	// $punNewAccBtn.attr("disabled", true);
	socket.emit("nightmareLogin", {username: $punUsername.val(), password: $punPassword.val()});
	$("#usernameCheckLoading").removeClass("is-invisible");
});

socket.on("failedLogin", function() {
	$("#startMessage").addClass("is-invisible");
	$("#failMessage").animateCss("fadeIn").removeClass("is-invisible");
	$punPassword.removeAttr("disabled");
	$punNewAccBtn.removeAttr("disabled");
	$("#usernameCheckLoading").addClass("is-invisible");
});

socket.on("successfulLogin", function(studentData) {
	userProfile.nightmareData = studentData;
	$("#usernameCheckLoading").addClass("is-invisible");
	$("#loginTopSection").animateCss("fadeOut", function () {
		$("#loginTopSection").addClass("is-hidden");
		$("#welcomeBackMsg").text("Final step! Link your Google account to get started.").animateCss("fadeIn").removeClass("is-invisible");
		$gSignin.animateCss("fadeIn").removeClass("is-invisible");
	});
});
