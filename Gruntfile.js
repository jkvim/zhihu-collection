// uglify not support es6, set aside
module.exports = function (grunt) {
	[
		'grunt-contrib-uglify',
		'grunt-contrib-cssmin',
		'grunt-hashres'
	].forEach(function (task) {
		grunt.loadNpmTasks(task);
	});

	grunt.initConfig({
		uglify: {
			all: {
				files: {
					'public/js.min/zhihu-collection.min.js': ['public/js/*.js']
				}
			}
		},
		cssmin: {
			combine: {
				files: {
					'public/css/zhihu-collection.css':['public/css/*.css',
					'!public/css/zhihu-collection.css']
				},
			},
			minify: {
				src: 'public/css/zhihu-collection.css',
				dest: 'public/css/style.min.css',
			}
		},
		hashres: {
			options: {
				fileNameFormat: '${name}.${hash}.${ext}'
			},
			all: {
				src: ['public/css/style.min.css'],
				dest: ['views/layouts/main.handlebars']
			}
		}
	});

	grunt.registerTask('static', ['cssmin', 'hashres']);
}


