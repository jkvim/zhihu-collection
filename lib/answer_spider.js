var cheerio = require('cheerio');
var S = require('string');
var tryCrawl = require('./util.js').tryCrawl;
var urlPrefix = 'www.zhihu.com';

var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://localhost/zhihu');
var People = require('../models/people.js')(db);
var PeopleQuestion = require('../models/people_question.js')(db);
var PeopleAnswer = require('../models/people_answer.js')(db);


function getAnswer(url, done) {
	tryCrawl(url, function (err, res) {
		parseAnswer(err, res.text, done);
	});
}

function parseAnswer(err, content, done) {
	if (err) {
		return ep.emit('parseAnswer ' + err);
	}
	var $ = cheerio.load(content);

	var $authorInfo = $('.answer-head .author-link');

	var authorName = $authorInfo.text() || '匿名用户';
	var authorUrl = $authorInfo.attr('href') || '/people/anonymous'

	People.update({name: authorName}, {
		name: authorName,
		url: authorUrl,
	}, {upsert: true}).exec();

	var $questionInfo = $('.zm-item-title.zm-editable-content >a');
	var questionId = $questionInfo.attr('href');
	var questionTitle = $questionInfo.text();
	if (questionId) {
		questionId = questionId.match(/\d+/g)[0];
	}

	var peopleId = authorUrl.match(/[\w-]+/g)[1];

	PeopleQuestion.update({id: questionId}, {
		id: questionId,
		title: questionTitle,
		peopleId: peopleId,
	}, {upsert: true}).exec();
	
	var $content = $('.zm-editable-content.clearfix').html();
	var $answerUrl = $('.answer-head').next('.zm-item-rich-text').attr('data-entry-url');

	//防止答案被修改或删除
	if ($content) {
		var realContent = $content.replace(/<img src=([^>]*?)data-actualsrc="(.*?)">|<noscript>.*<\/noscript>/g, function (imgUrl, srcUrl, actualsrc) {
			if (actualsrc) {
				return `<img src="${actualsrc}">`;
			} else {
				return '';
			}
		});

		realContent = S(realContent).decodeHTMLEntities().s; 

		PeopleAnswer.update({questionId: questionId}, {
			answerLink: $answerUrl,
			content: realContent,
			questionId: questionId,
		}, {upsert: true}).exec();
	}

	console.log('fetch answer success.');

	if (done) { 
		done(null);
	}
}


exports.getAnswer = getAnswer;
