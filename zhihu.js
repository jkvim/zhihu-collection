var express = require('express');
var superagent = require('superagent');
require('superagent-retry')(superagent);
var cheerio = require('cheerio');
var path = require('path');
var eventproxy = require('eventproxy');
var async = require('async');


var url = 'http://www.zhihu.com/people/xi-yang-86-73/collections';
superagent.get(url)	
	.timeout(1000)
	.retry(1)
	.end(function (err, res) {
		if (err) {
			return console.log(err);
		}
		console.log('start fetch');

		var $ = cheerio.load(res.text);
		var host = 'www.zhihu.com'; 
		var items = [];
		$('.zm-profile-fav-item-title').each(function (idx, item) {
			$item = $(item);
			var href = $item.attr('href');
			items.push(path.join(host, href));
		});
		console.log(items);

		 // ep.on('parse_result', function (collections) {
			// collections.forEach(function (collect) {
				// var $ = cheerio.load(collect);
				// var collectionTitle = $('.zh-fav-head-title').text().trim();
				// console.log('collection title:', collectionTitle);
				// var answers = [];

				// $('.zm-item').each(function(idx, item) { 
					// $item = $(item);
					// var author = $item.find('a[data-tip]').text().trim();
					// var title = $item.find('.zm-item-title').text().trim();
					// // var content = $item.find('.content.hidden');
					// answers.push({
						// author: author,
						// title: title
					// });
				// });
				// console.log(answers);
			// });
		// });


		var count = 0;
		async.mapLimit(items, 5, function (url, callback) {
			fetchUrl(url, callback);
		}, function (err, results) {
			console.log('done ', ++count);
		});
});

function fetchUrl(url, callback) {
	console.log('start ' + url);
	superagent.get(url)
	// .timeout(1000)
	// .retry(3)
	.set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:41.0) Gecko/20100101 Firefox/41.0')
	.end(function (err, res) {
		if (err) {
			callback(err);
		}

		console.log('fetch ' + url + ' sucess');
		callback(null, res);
	});	
}
