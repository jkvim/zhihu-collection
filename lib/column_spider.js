var superagent = require('superagent');
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var async = require('async');
var eventproxy = require('eventproxy');
var url = require('url');
var paht = require('path');
var util = require('./util.js');
var Post = require('../models/post.js');
var Column = require('../models/column.js');
var mongoose = require('mongoose');

var db = mongoose.connect('mongodb://localhost/zhihu');
var userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36';


var columnUrl = 'http://www.zhihu.com/people/xiao-yan-jing-43/posts';
var ep = new eventproxy();
// var uid = 'xiao-yan-jing-43';

var upsert = {upsert:true}; 

ep.on('save column', function (column) {
	var query = {uid: column.uid};
	Column.update(query,
								column, 
								upsert).exec();	
});

ep.on('parse_posts', function (posts) {
	async.forEachOf(posts, function (item, key, callback) {
		try {
			var post = JSON.parse(item.postContent);
		} catch(e) {
			// ignore error
			return console.log(e);
		}
		var query = {slug: item.slug};
		post = {
			url: item.url,
			uid: item.uid,
			slug: item.slug,
			author: post.author.name,
			title: post.title,
			content: post.content.toString(),
		};

		Post.update(query, post, upsert).exec();
		callback(null);
	}, function (err) {
		// final call
		// db.disconnect();
	});

});

superagent.get(columnUrl)
.set('User-Agent', userAgent)
.end(function (err, res) {
	if (err) {
		throw err;
	}

	var $ = cheerio.load(res.text);
	var uid = '';
	var slugs = [];
	var columnTitle = $('.column .name').text();

	$('.post-link').each(function (idx, element) {
		var $element = $(element);
		var postInfo = $element.attr('href').match(/.*\/(\w+)\/(\d+)/);
		uid = postInfo[1];
		slugs.push(postInfo[2]);
	});

	ep.emit('save column', {
		uid: uid,
		title: columnTitle,
	});

	async.map(slugs, function (item, done) {
		var postApi = `http://zhuanlan.zhihu.com/api/columns/${uid}/posts/${item}`
		superagent.get(postApi)
		.end(function (err, res) {
			if (err) {
				// ignore error
				return console.error(err);
			}

			var post = {
				url: postApi,
				uid: uid,
				slug: item,
				postContent: res.text,
			}
			done(null, post);
		});
	}, function (err, results) {
		ep.emit('parse_posts', results);
	});
});


ep.fail(function (err) {
	throw '[EventProxy] ' + err ;
});
