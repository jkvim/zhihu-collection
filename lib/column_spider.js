var superagent = require('superagent');
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var async = require('async');
var eventproxy = require('eventproxy');
var url = require('url');
var co = require('co');
var paht = require('path');
var mongoose = require('mongoose');
var tryCrawl = require('./util.js').tryCrawl;
var userAgent = require('./util.js').userAgent;
var urlPrefix = 'http://zhuanlan.zhihu.com';

var db = mongoose.createConnection('mongodb://localhost/zhihu');
var Post = require('../models/post.js')(db);
var Column = require('../models/column.js')(db);

var upsert = {upsert:true}; 

var ep = new eventproxy();

function crawAllPost(destUrl) {
	return function (next) {
		tryCrawl(destUrl, function (err, res) {
			parsePosts(err, res.body, next);
		});
	}
}

function getAllPosts(columnUrl, done) {
	var matchUrl = columnUrl.match(/zhuanlan.zhihu.com\/(\w+)/);
	if (!matchUrl || matchUrl.length != 2) {
		return ep.emit('error', 'invalid column url');
	}

	var uid = matchUrl[1];
	var templateUrl = `http://zhuanlan.zhihu.com/api/columns/${uid}/posts?limit=10&offset=`

	co(function *() {
		var leftPost = true;
		var offset = 0;
		while (leftPost) {
			console.log(offset);
			leftPost = yield crawAllPost(templateUrl + offset);
			offset += 10;
		}
	}).then(function () {
		if (done) done(null);
	}).catch(function (err) {
		ep.emit('error', 'fetch posts fail. ' + err);
		done(err);
	});
}

function parsePosts(err, res, next) {
	if (err) {
		return ep.emit('error', err);
	}

	if (!res || res.length === 0) {
		return next(null, false);
	}


	//分析posts信息, 并发抓取post
	async.forEachOfLimit(res, 3, function (item, index, callback) {
		getOnePost(item.href, callback);
	}, function (err) {
		// igonre fetch error
		next(null, true);
	});

}


// 抓取一篇post的内容
function getOnePost(destUrl, done) {
	var postUrl = urlPrefix + destUrl;

	tryCrawl(postUrl, function (err, res) {
		if (err) {
			ep.emit('error', `fetch post ${postUrl} fail.` + error);
			return done(null);
		}

		var post = res.body;
		ep.emit('save post', post);
		done(null);
	});
}

function updateHanle(err, raw) {
	if (err) {
		ep.emit('error', 'db update error ' +  err);
	}
}
ep.on('save post', function (post) {
	Column.update({columnSlug: post.column.slug},
								{
									columnSlug: post.column.slug,
									columnName: post.column.name,
								}, upsert).exec();

	Post.update({postSlug: post.slug}, {
								columnSlug: post.column.slug,
								postSlug: post.slug,
								author: post.author.name,
								title: post.title,
								titleImage: post.titleImage,
								url: urlPrefix + post.url,
								content: post.content,
							}, upsert).exec();

});

ep.on('parse_posts', function (posts) {
	async.forEachOf(posts, function (item, key, callback) {
		try {
			var post = JSON.parse(item.postContent);
		} catch(e) {
			return callback(`parse ${item.url} json fail` + e);
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
		if (err) {
			console.log(err);
		}
		db.close();
	});
});

ep.fail(function (err) {
	console.log('err'); 
});

exports.getAllPosts = getAllPosts;
