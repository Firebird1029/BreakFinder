"use strict"; /* eslint-env node */ /* global */ /* eslint no-warning-comments: [1, { "terms": ["todo", "fix", "help"], "location": "anywhere" }] */
var debug = false;

// Load Node Dependencies & Custom Modules
var express = require("express"),
	router = express.Router(),
	utils = require("../utils.js");

module.exports = router;

router.get("/", (req, res) => {
	res.render("index.pug", {
		options: {}
	});
});
