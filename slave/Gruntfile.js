module.exports = function(grunt) {

  	grunt.initConfig({
	  nodewebkit: {
	    options: {
	        build_dir: './webkitbuilds', // Where the build version of my node-webkit app is saved
			version: "0.8.6",
	        mac: true, // We want to build it for mac
	        win: false, // We want to build it for win
	        linux32: false, // We don't need linux32
	        linux64: false, // We don't need linux64
			keep_nw: true
	    },
	    src: ['./**/*', "!./CSS/**.less", "!./**/*.min.*", "!./**/*-ck.*","!./node_modules/gru*/**", "!./webkitbuilds/**/*"]
	},
	});
	
	grunt.loadNpmTasks('grunt-node-webkit-builder');
	grunt.registerTask('default', ['nodewebkit']);

};
