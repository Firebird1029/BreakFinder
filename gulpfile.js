var gulp = require("gulp"),
	plugins = require("gulp-load-plugins")(),
	browserSync = require("browser-sync").create();
	// sass = require("gulp-sass"),
	// autoprefixer = require("gulp-autoprefixer"),
	// cssMin = require("gulp-cssmin"),
	// sourcemaps = require("gulp-sourcemaps");

gulp.task("css", function () {
	return gulp.src(["./src/sass/main.scss"])
	.pipe(plugins.sourcemaps.init())
	.pipe(plugins.sass().on("error", plugins.sass.logError))
	.pipe(plugins.cssmin())
	.pipe(plugins.autoprefixer())
	.pipe(plugins.sourcemaps.write())
	.pipe(gulp.dest("./dist/css"))
	.pipe(browserSync.stream());
});

gulp.task("js", function () {
	return gulp.src([
		"./src/js/client.js"
	])
	.pipe(plugins.sourcemaps.init())
	.pipe(plugins.babel({
		presets: ["@babel/env"]
	}))
	.pipe(plugins.concat("all.js"))
	.pipe(plugins.uglify())
	.pipe(plugins.sourcemaps.write())
	.pipe(gulp.dest("dist/js"))
	.pipe(browserSync.stream());
});

gulp.task("watch", function () {
	gulp.watch(["src/sass/*.scss", "src/sass/*.sass"], gulp.series("css"));
	gulp.watch(["src/js/*.js"], gulp.series("js"));
});

gulp.task("serve", function () {
	browserSync.init(null, {
		proxy: {
		    target: "http://localhost:8000",
		    ws: true
		},
		// files: ["views/**/*.*"],
		// browser: "google chrome",
		port: 8001,
		open: false
	});

	gulp.watch("*.pug").on("change", browserSync.reload);
	gulp.watch("views/**/*.pug").on("change", browserSync.reload);
});

gulp.task("default", gulp.series("css", "js", gulp.parallel("watch", "serve")));
gulp.task("production", gulp.series("css", "js"));
