var cheerio = require('cheerio');
var async = require('async');
var url = require('url');
var co = require('co');
var mongoose = require('mongoose');
var tryCrawl = require('./util.js').tryCrawl;

var MONGO_HOST = process.env.MONGO_HOST || 'localhost';
var MONGO_PORT = process.env.MONGO_PORT || '27017';
var db = mongoose.createConnection('mongodb://' + MONGO_HOST + ':' + MONGO_PORT + '/' + 'zhihu');
var Answer = require('../models/answer.js')(db);
var Question = require('../models/question.js')(db);
var Collection = require('../models/collection.js')(db);

function sleep1s(cb) {
  return () => {
    setTimeout(cb, 1000);
  }
}

// 抓取所有的收藏夹
function crawlAllCollection() {
	return tryCrawl(arguments[0]).then((res) => {
    return parseAllCollectionHtml(res.text);
  });
}

// 抓取单个文件夹, thunk化, 使其被co使用
function crawlOneCollection() {
  return tryCrawl(arguments[0]).then((res) => {
    return parseOneCollection(res.text);
  });
}

// 此函数适用于专栏和收藏夹分页抓取
function getCollection(handle) {
	return function (prefix) {
		return co(function *() {
			var res = true;
			var pageNum = 1;
			while (res) {
				res = yield handle(prefix+'?page=' + pageNum++);
			}
		}).catch((err) => {
      return Promise.reject(err);
    });
	};
}

var getOne = getCollection(crawlOneCollection);
var getAll = getCollection(crawlAllCollection);

function parseAllCollectionHtml(html) {
	var $ = cheerio.load(html);
	var host = 'http://www.zhihu.com'; 
	var items = [];
	$('.zm-profile-fav-item-title').each(function (idx, item) {
		$item = $(item);
		var href = $item.attr('href');
		if (href) {
			items.push(url.resolve(host, href));
		}
	});

	console.log('total collection:', items.length);
  if (items.length === 0) {
    return Promise.resolve(0);
  }

	//此处控制抓取个人收藏夹的并发数
  return co(function* () {
    var res = [];
    for (var i = 0; i < items.length; i++) {
      res[i] = yield getOne(items[i]);
    }
    return res[i];
  });
}

function parseOneCollection(html) {
	var $ = cheerio.load(html);
	var collectionTitle = $('#zh-fav-head-title').text();
	var collectionId = $('meta[http-equiv="mobile-agent"]');
	collectionTitle = collectionTitle && collectionTitle.trim();
	collectionId = collectionId && collectionId.attr('content').match(/\d{7,}/g)[0];

	console.log('collection title:', collectionTitle);
	var questions = {};
  var missions = [];

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
	  var editTime = $item.find('.answer-date-link').text();
		var content = $item.find('.content').val();
		var issueId = answerHref && answerHref.match(/(\w+)/g)[1];

		if (content && issueId) {
			var answer = {
				author: author,
				authorLink: authorLink || '', 
				answerLink: answerHref,
				content: content,
				editTime: editTime,
				questionId: issueId
			};
			questions[issueId].answers.push(answer);
		}
	});

  return saveToDB({
		id: collectionId,
		title: collectionTitle,
		questions: questions,
  }).then(() => {
    // answer count
    return !!$('.zm-item').length;
  });
}

function saveToDB(collection) {
	var collectionId = collection.id;
	var questions = collection.questions;
	var query = {id: collectionId};
  var missions = []; 

  missions.push(
    Collection.update(query,
                      {query, title: collection.title},
                      {upsert: true}).exec());

	Object.keys(questions).forEach(function (element, idx) {
		var question = questions[element];

    missions.push(
      Question.update({id: element},
                      {id: element, title: question.title,
                       collectionId: collectionId},
                      {upsert: true}).exec());

		question.answers.forEach(function (answer) {
      missions.push(
        Answer.update(
          {answerLink: answer.answerLink},
          answer,
          {upsert: true}).exec());
		});
	});

  return Promise.all(missions);
}

exports.db = db;
exports.getAll = getAll;
exports.getOne = getOne;
