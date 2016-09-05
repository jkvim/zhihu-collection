var co = require('co');
var mongoose = require('mongoose');
var tryCrawl = require('./util.js').tryCrawl;
var urlPrefix = 'http://zhuanlan.zhihu.com';

var MONGO_HOST = process.env.MONGO_HOST || 'localhost';
var MONGO_PORT = process.env.MONGO_PORT || '27017';
var db = mongoose.createConnection('mongodb://' + MONGO_HOST + ':' + MONGO_PORT + '/' + 'zhihu');
var Post = require('../models/post.js')(db);
var Column = require('../models/column.js')(db);

function crawAllPost(url) {
	return tryCrawl(url).then((res) => {
		return parsePosts(res.body);
  });
}

function getAllPosts(columnUrl) {
  var matchUrl = columnUrl.match(/zhuanlan.zhihu.com\/([\w-]+)/);
  if (!matchUrl || matchUrl.length != 2) {
    return Promise.reject('error', 'invalid column url');
  }

	var uid = matchUrl[1];
	var templateUrl = `http://zhuanlan.zhihu.com/api/columns/${uid}/posts?limit=10&offset=`

	return co(function* () {
		var leftPost = true;
		var offset = 0;
		while (leftPost) {
			console.log(offset);
			leftPost = yield crawAllPost(templateUrl + offset);
			offset += 10;
		}
	});
}

function parsePosts(res) {
  return new Promise((resolve, reject) => {
    if (!res || res.length === 0) {
      return resolve(false);
    }

    var missions = res.map(item => {
      return getOnePost(item.href);
    });

    return Promise.all(missions).then(() => {
      return resolve(true);
    });
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

  return tryCrawl(postUrl)
    .then(res => {
      console.log(`fetch post ${postUrl} success`);
      return savePost(res.body);
  });
}

function savePost (post) {
  var missions = [];
  missions.push(
    Column.update({columnSlug: post.column.slug}, {
                    columnSlug: post.column.slug,
                    columnName: post.column.name,
                  }, {upsert: true}).exec());

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
                  }, {upsert: true}).exec());
	}
  return Promise.all(missions);
}


exports.db = db;
exports.getAllPosts = getAllPosts;
exports.getOnePost = getOnePost;
