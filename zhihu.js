var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');
var path = require('path');


var url = 'http://www.zhihu.com/people/xi-yang-86-73/collections';
superagent.get(url)
	.set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36')
	.end(function (err, res) {
		if (err) {
			return console.log(err);
		}

		var $ = cheerio.load(res.text);
		var urlRoot = 'http://www.zhihu.com'; 
		var items = [];
		$('.zm-profile-fav-item-title').each(function (idx, item) {
			$item = $(item);
			var href = $item.attr('href');
			items.push(path.join(urlRoot, href));
		});


		console.log(items);
});
