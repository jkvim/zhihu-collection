var superagent = require('superagent');
var moment = require('moment');
var retry = require('retry');
var cheerio = require('cheerio');
var path = require('path');
var eventproxy = require('eventproxy');
var async = require('async');
var url = require('url');
var fs = require('fs');
var util = require('./util.js');
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
		var targetUrl = 'http://www.zhihu.com/people/li-san-xing-50/collections';

		superagent.get(targetUrl)	
		.timeout(2000)
		.set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:41.0) Gecko/20100101 Firefox/41.0')
		.end(function (err, res) {
			if (connect.retry(err)) {
				return console.log(err);
			}

			parseCollectionHtml(err ? 'error:' + connect.mainError() :
													null, res && res.text);
		});
	});
}

function parseCollectionHtml(err, text) {
	if (err) {
		return console.error(err);
	}

	var $ = cheerio.load(text);
	var host = 'http://www.zhihu.com'; 
	var items = [];
	$('.zm-profile-fav-item-title').each(function (idx, item) {
		$item = $(item);
		var href = $item.attr('href');
		items.push(url.resolve(host, href));
	});

	console.log('total collection:', items.length);

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
			callback(err ? operation.mainError() : null, res.text);
		});	
	});
}

ep.on('parse_result', function (collections) {

	collections.forEach(function (collect) {
		var $ = cheerio.load(collect);
		var collectionTitle = $('#zh-fav-head-title').text();
		var collectionId = $('meta[http-equiv="mobile-agent"]');
		collectionTitle = collectionTitle && collectionTitle.trim();
		collectionId = collectionId && collectionId.attr('content').match(/\d{7,}/g)[0];

		console.log('collection title:', collectionTitle);
		var questions = {};

		$('div.zm-item').each(function(idx, item) { 
			$item = $(item);
			var title = $item.find('.zm-item-title').text().trim();
			var titleHref = $item.find('.zm-item-title > a').attr('href');
			var titleId = titleHref && titleHref.match(/(\d+)/g)[0];
			if (titleId) questions[titleId] = {title: title, answers: []};

			var answerHref = $item.find('.zm-item-rich-text.js-collapse-body')
											.attr('data-entry-url');

			var author = $item.find('.zm-item-rich-text.js-collapse-body')
												.attr('data-author-name');

			var content = $item.find('.content.hidden').val();

			var issueId = answerHref && answerHref.match(/(\w+)/g)[1];

			if (content && issueId) {
				content = content.split('\n\n\n\n');
				var editTime = content[1].trim();
				editTime = (editTime && editTime.match(/\d{4}-\d{2}-\d{2}/g));
				editTime = (editTime && editTime[0]) || moment().format('YYYY-MM-DD'); 

				console.log('editTime:', editTime);
				var answer = {
					author: author,
					href: answerHref,
					content: content[0],
					editTime: editTime,
					parentId: issueId
				};
				questions[issueId].answers.push(answer);
				console.log(questions);
			}
		});

		ep.emit('save', {
			id: collectionId,
			title: collectionTitle,
			questions: questions,
		});
	});
});

ep.on('save', function (collection) {
	var collectionId = collection.id;
	var questions = collection.questions;
	var collectPath = './public/collection';
	var query = {id: collectionId};

	Collection.update(query,
									  {query, title: collection.title},
									 	{upsert: true},
									 	dbUpdateHandler);

	async.auto({
		root_dir: function (callback) {
			util.createDir(collectPath, callback); 
		},

		mkdir:['root_dir', function (callback, result) {
			collectPath = path.resolve(result.root_dir, collection.title);
			util.createDir(collectPath, callback);
		}],

		write_file: ['mkdir', function (callback, result) {
			var saveFiles = [];
			Object.keys(questions).forEach(function (element, idx) {
				var fileName = path.resolve(result.mkdir, element + '.html');
				var question = questions[element];
				var outStream = fs.createWriteStream(fileName);

				Question.update({id: element},
											 	{id: element, title: question.title, parentId: collectionId},
											 	{upsert: true},
											 	dbUpdateHandler);

				util.pipe(outStream, [
					'<meta http-equiv="Content-Type" content="text/html;' +
					'charset=utf-8">\n',
					'<h2 class="title">' + question.title + '</h2>\n']);

				question.answers.forEach(function (answer) {
					Answer.update(
						{href: answer.href},
						answer,
						{upsert: true},
						dbUpdateHandler);

					util.pipe(outStream, [
						'<p class="author">' + answer.author + '</p>\n\n',
						'<a href="' + answer.href + '">link</a>',
						'<p class="content">\n' + answer.content + '\n</p>']);
				});
				saveFiles.push(fileName);
			});
			callback(null, saveFiles);
		}]
	}, function (err, results) {
		console.log('done');
		console.log('err = ', err);
		console.log('results = ', results);
	});
});

function dbUpdateHandler(err, raw) {
	if (err) console.log('err:', err);
	console.log('raw:', raw);
}

ep.fail(function (err) {
	throw err;
});

exports.startCrawl = startCrawl;
