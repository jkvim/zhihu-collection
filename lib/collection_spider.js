var superagent = require('superagent');
var moment = require('moment');
var retry = require('retry');
var cheerio = require('cheerio');
var path = require('path');
var eventproxy = require('eventproxy');
var async = require('async');
var url = require('url');
var fs = require('fs');
var ep = new eventproxy();
var mongoose = require('mongoose');
var Answer = require('../models/answer.js');
var Question = require('../models/question.js');
var Collection = require('../models/collection.js');

var db = mongoose.connect('mongodb://localhost/zhihu');

function startCrawl() {

	var connect = retry.operation({
		retries: 5,
		minTimeout: 500,
		factor:1.6
	});

	connect.attempt(function (currentAttempt) {
		var targetUrl = 'http://www.zhihu.com/people/yue-qian-ren-er-xi-zhi-ji/collections';

		superagent.get(targetUrl)	
		.timeout(2000)
		.set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:41.0) Gecko/20100101 Firefox/41.0')
		.end(function (err, res) {
			if (connect.retry(err)) {
				return console.log(err);
			}

			parseCollectionHtml(err , res && res.text);
		});
		console.log('current retry:', currentAttempt);
		if (currentAttempt === 6) process.exit(1);
	});
}

function parseCollectionHtml(err, text) {
	if (err) {
		return console.error(err);
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
	if (items.length === 0) {
		return 0;
	}

	async.mapLimit(items, 8, function (url, callback) {
		fetchUrl(url, callback);
	}, function (err, results) {
		ep.emit('parse_result', results);
	});

}

var count = 0;

function fetchUrl(url, callback) {
	console.log('start ' + url);
	var operation = retry.operation({
		retries: 5,
		minTimeout: 500,
		factor: 1.6 
	});

	operation.attempt(function (currentAttempt) {
		superagent.get(url)
		.set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:41.0) Gecko/20100101 Firefox/41.0')
		.timeout(2000)
		.end(function (err, res) {
			if (operation.retry(err)) {
				return;
			}

			console.log('fetch ' + url + ' sucess; count:', ++count);
			if (res && res.text) {
				callback(null, res && res.text);
			} else {
				console.log(operation.mainError() + ', attemp:' + currentAttempt + ' url:' + url + ' res:' + res);
				// 超时忽略错误, 继续抓取
				callback(null);
			}
		});	
	});
}

ep.on('parse_result', function (collections) {

	collections.forEach(function (collect) {
		if (collect) {
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

			ep.emit('save', {
				id: collectionId,
				title: collectionTitle,
				questions: questions,
			});
		}
	});
});

ep.on('save', function (collection) {
	var collectionId = collection.id;
	var questions = collection.questions;
	var query = {id: collectionId};

	Collection.update(query,
										{query, title: collection.title},
										{upsert: true},
										dbUpdateHandler);

	Object.keys(questions).forEach(function (element, idx) {
		var question = questions[element];

		Question.update({id: element},
										{id: element, title: question.title,
										 collectionId: collectionId},
										{upsert: true},
										dbUpdateHandler);

		question.answers.forEach(function (answer) {
			Answer.update(
				{answerLink: answer.answerLink},
				answer,
				{upsert: true},
				dbUpdateHandler);
		});
	});
});

function dbUpdateHandler(err, raw) {
	if (err) console.log('err:', err);
}

ep.fail(function (err) {
	throw err;
});

exports.startCrawl = startCrawl;
