var superagent = require('superagent');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');
var eventproxy = require('eventproxy');
var url = require('url');
var paht = require('path');


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
			posts.forEach(function (post) {
				console.log(JSON.parse(post));
			});
		});

});


