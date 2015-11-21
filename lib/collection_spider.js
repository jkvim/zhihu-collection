var superagent = require('superagent');
var moment = require('moment');
var cheerio = require('cheerio');
var path = require('path');
var eventproxy = require('eventproxy');
var async = require('async');
var url = require('url');
var fs = require('fs');
var co = require('co');
var mongoose = require('mongoose');
var userAgent = require('./util.js').userAgent;
var cookie = require('./util.js').cookie;
var tryCrawl = require('./util.js').tryCrawl;

var db = mongoose.createConnection('mongodb://localhost/zhihu');
var Answer = require('../models/answer.js')(db);
var Question = require('../models/question.js')(db);
var Collection = require('../models/collection.js')(db);

var ep = new eventproxy();

ep.fail(function (err) {
	console.log(err);
});

// 抓取所有的收藏夹
function crawlAllCollection(destUrl) {
	console.log(`fetch ${destUrl}`);
	return function (next) {
		tryCrawl(destUrl, function (err ,res) {
			parseAllCollectionHtml(err, res.text, next);
		});
	}
}

// 抓取单个文件夹, thunk化, 使其被co使用
function crawlOneCollection(destUrl) {
	console.log(`fetch ${destUrl}`);
	return function (next) {
		tryCrawl(destUrl, function (err, res) {
			parseOneCollection(err, res.text, next);
		});
	}
}

// 利用闭包, 生成函数
function getCollection(handle) {
	return function (url, done) {
		co(function *() {
			var res = true;
			var pageNum = 1;
			while (res) {
				res = yield handle(url+'?page=' + pageNum++);
			}
		}).then(function () {
			// 通知控制流已完成抓取
			if (done) done(null);
		}).catch(function (err) {
			if (err) {
				ep.emit('error', err);
			}
			done(err);
		});	
	};
}

var getOne = getCollection(crawlOneCollection);
var getAll = getCollection(crawlAllCollection);

function parseAllCollectionHtml(err, text, next) {
	if (err) {
		return ep.emit('error', 'parseCollectionHtml fail, error ' + err);
	}

	if (!text) {
		return ep.emit('error', 'parseCollectionHtml fail, text is undefined.');
	}

	var $ = cheerio.load(text);
	var host = 'http://www.zhihu.com'; 
	var items = [];
	$('a.zm-profile-fav-item-title').each(function (idx, item) {
		$item = $(item);
		var href = $item.attr('href');
		if (href) {
			items.push(url.resolve(host, href));
		}
	});

	console.log('total collection:', items.length);

	//此处控制抓取个人收藏夹的并发数
	async.forEachOfLimit(items, 1, function (url, key, callback) {
		getOne(url, callback);
	}, function () {
		// final call, control getCollection, igonre error
		if (items.length === 0) {
			next(null, false);
		} else {
			next(null, true);
		}
	});
}

function parseOneCollection(error, collect, next) {
	if (error) {
		return ep.emit('error', error);
	}

	if (!collect) {
		return ep.emit('error', 'parseOneCollection fail, collect is undefined.');
	}

	var $ = cheerio.load(collect);
	var collectionTitle = $('#zh-fav-head-title').text();
	var collectionId = $('meta[http-equiv="mobile-agent"]');
	collectionTitle = collectionTitle && collectionTitle.trim();
	collectionId = collectionId && collectionId.attr('content').match(/\d{7,}/g)[0];

	console.log('collection title:', collectionTitle);
	var questions = {};

	$('.zm-item').each(function(idx, item) { 
		$item = $(item);
		var title = $item.find('.zm-item-title').text().trim();
		var titleHref = $item.find('.zm-item-title > a').attr('href');
		var titleId = titleHref && titleHref.match(/(\d+)/g)[0];
		if (titleId) questions[titleId] = {title: title, answers: []};

		var answerHref = $item.find('.zm-item-rich-text.js-collapse-body')
		.attr('data-entry-url');

		var author = $item.find('.zm-item-rich-text.js-collapse-body')
		.attr('data-author-name');
		var authorLink = $(item).find('.author-link').attr('href');

		var content = $item.find('.content.hidden').val();

		var issueId = answerHref && answerHref.match(/(\w+)/g)[1];

		if (content && issueId) {
			content = content.split('\n\n\n\n');
			var editTime = content[1].trim();
			editTime = (editTime && editTime.match(/\d{4}-\d{2}-\d{2}/g));
			editTime = (editTime && editTime[0]) || moment().format('YYYY-MM-DD'); 

			var answer = {
				author: author,
				authorLink: authorLink || '', 
				answerLink: answerHref,
				content: content[0],
				editTime: editTime,
				questionId: issueId
			};
			questions[issueId].answers.push(answer);
		}
	});

	ep.emit('save to db', {
		id: collectionId,
		title: collectionTitle,
		questions: questions,
	});

	// for co get next page
	var answerCount = $('.zm-item').length;
	if (answerCount) {
		console.log('answer count:', answerCount);
		next(null, true);
	} else {
		next(null, false);
	}
}

ep.on('save to db', function (collection) {
	var collectionId = collection.id;
	var questions = collection.questions;
	var query = {id: collectionId};

	Collection.update(query,
										{query, title: collection.title},
										{upsert: true}).exec();

	Object.keys(questions).forEach(function (element, idx) {
		var question = questions[element];

		Question.update({id: element},
										{id: element, title: question.title,
										 collectionId: collectionId},
										{upsert: true}).exec();

		question.answers.forEach(function (answer) {
			Answer.update(
				{answerLink: answer.answerLink},
				answer,
				{upsert: true}).exec();
		});
	});
});



exports.getAll = getAll;
exports.getOne = getOne;
