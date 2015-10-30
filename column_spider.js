var superagent = require('superagent');
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var async = require('async');
var eventproxy = require('eventproxy');
var url = require('url');
var paht = require('path');
var util = require('./util.js');


var columnUrl = 'http://www.zhihu.com/people/xiao-yan-jing-43/posts';
var ep = new eventproxy();
// var uid = 'xiao-yan-jing-43';

superagent.get(columnUrl)
	.set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36')
	.end(function (err, res) {
		if (err) {
			throw err;
		}

		var $ = cheerio.load(res.text);
		var uid = '';
		var slugs = [];
		$('.post-link').each(function (idx, element) {
			var $element = $(element);
			var postInfo = $element.attr('href').match(/.*\/(\w+)\/(\d+)/);
			uid = postInfo[1];
			slugs.push(postInfo[2]);
		});

		slugs.forEach(function (slug) {
			var postApi = `http://zhuanlan.zhihu.com/api/columns/${uid}/posts/${slug}`
			superagent.get(postApi)
				.end(function (err, res) {
					if (err) {
						throw err;
					}
					ep.emit('parse_posts', res.text);
				});
		});

		ep.after('parse_posts', slugs.length, function (posts) {
			var postDir = './posts';
			async.auto({
				mkdir: function (callback) {
					util.createDir(postDir, callback);
				},
				write_file: ['mkdir', function (callback, result) {
					posts.forEach(function (post) {
						post = JSON.parse(post);
						var href = post.href.match(/\/api\/columns\/(.*)/)[1].replace(/\//g, '_');
						var fileName = href + '.html';
						var postPath = path.resolve(postDir, fileName);
						var outStream = fs.createWriteStream(postPath);	

						util.pipe(outStream, [
							'<meta http-equiv="Content-Type" content="text/html;' +
								'charset=utf-8">',
							'<p id=\'author\'>' + post.author.name + '</p>\n\n',
							'<p id=\'title\'>' + post.title + '</p>\n\n',
							'<p id=\'content\'>\n' + post.content + '\n</p>'],
							{end: true});
					});
				}]	
			}, function (err, results) {
				console.log('done');
				console.log('err:', err);	
				console.log('results:', results);
			});
		});
});

ep.fail(function (err) {
	throw '[EventProxy] ' + err ;
});
