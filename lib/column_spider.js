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
			if (err) {
				return ep.emit('error', err);
			}
			parsePosts(err, res.body, next);
		});
	}
}

function getAllPosts(columnUrl) {
	var matchUrl = columnUrl.match(/zhuanlan.zhihu.com\/([\w-]+)/);
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
	}).catch(function (err) {
		ep.emit('error', 'fetch posts fail. ' + err);
	});
}

function parsePosts(err, res, next) {
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
function getOnePost(destUrl) {
	if (destUrl.search('/api/') === 0) {
		var postUrl = urlPrefix + destUrl;
	} else {
		var parseUrl = destUrl.match(/.*zhihu.com\/(\w+)\/(\w+)/);
		var colunnSlug = parseUrl[1];
		var postSlug = parseUrl[2];
		var postUrl = `${urlPrefix}/api/posts/${postSlug}`
	}

	tryCrawl(postUrl, function (err, res) {
		if (err) {
			ep.emit('error', `fetch post ${postUrl} fail.` + err);
		}

		var post = res.body;
		console.log(`fetch post ${postUrl} success`);
		ep.emit('save post', post);
	});
}

ep.on('save post', function (post) {
  var missions = [];
  missions.push(
    Column.update({columnSlug: post.column.slug}, {
                    columnSlug: post.column.slug,
                    columnName: post.column.name,
                  }, upsert).exec());

	if (post.content) {
  missions.push(
    Post.update({postSlug: post.slug}, {
                  columnSlug: post.column.slug,
                  postSlug: post.slug,
                  author: post.author.name,
                  title: post.title,
                  titleImage: post.titleImage.replace(/_r\.jpg/, '_b.jpg') ,
                  url: urlPrefix + post.url,
                  content: post.content,
                }, upsert).exec());
	}

  Promise.all(missions)
    .then(() => {
      db.close();
    });

});

//ep.on('parse_posts', function (posts) {
//	async.forEachOf(posts, function (item, key, callback) {
//		try {
//			var post = JSON.parse(item.postContent);
//		} catch(e) {
//			return callback(`parse ${item.url} json fail` + e);
//		}
//		var query = {slug: item.slug};
//		post = {
//			url: item.url,
//			uid: item.uid,
//			slug: item.slug,
//			author: post.author.name,
//			title: post.title,
//			content: post.content.toString(),
//		};
//
//		Post.update(query, post, upsert).exec();
//		callback(null);
//	}, function (err) {
//		// final call
//		if (err) {
//			console.log(err);
//		}
//		db.close();
//	});
//});

ep.fail(function (err) {
	console.log('err'); 
});

exports.getAllPosts = getAllPosts;
exports.getOnePost = getOnePost;
