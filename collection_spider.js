var superagent = require('superagent');
var retry = require('retry');
var cheerio = require('cheerio');
var path = require('path');
var eventproxy = require('eventproxy');
var async = require('async');
var url = require('url');
var fs = require('fs');


var connectControl = retry.operation({
	retries: 5,
	minTimeout: 500,
	factor:1.6
});

var ep = new eventproxy();

connectControl.attempt(function (currentAttempt) {
	var targetUrl = 'http://www.zhihu.com/people/li-san-xing-50/collections';

	superagent.get(targetUrl)	
	.timeout(2000)
	.set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:41.0) Gecko/20100101 Firefox/41.0')
	.end(function (err, res) {
		if (connectControl.retry(err)) {
			return console.log(err);
		}

		var $ = cheerio.load(res.text);
		var host = 'http://www.zhihu.com'; 
		var items = [];
		$('.zm-profile-fav-item-title').each(function (idx, item) {
			$item = $(item);
			var href = $item.attr('href');
			items.push(url.resolve(host, href));
		});

		console.log('total collection:', items.length);

		ep.on('parse_result', function (collections) {

			collections.forEach(function (collect) {
				var $ = cheerio.load(collect);
				var collectionTitle = $('#zh-fav-head-title').text().trim();
				console.log('collection title:', collectionTitle);
				var answers = [];

				$('.zm-item').each(function(idx, item) { 
					$item = $(item);
					var author = $item.find('.zm-item-answer-author-wrap > a').text();
					var title = $item.find('.zm-item-title').text().trim();
					var href = $item.find('.zm-item-rich-text.js-collapse-body').attr('data-entry-url');
					var content = $item.find('.content.hidden').val();
					content = content.slice(0, content.search('\n\n\n\n'));
					var id = href.replace(/\/(?=(\w+))/g, function (match, word) {
						if (word === 'question') { 	
							return '';
						} else {
							return '_';
						}
					});

					answers.push({
						author: author || '匿名用户',
						title: title,
						id: id,
						content: content
					});
				});
				
				ep.emit('save', {
					title: collectionTitle,
					answers: answers
				});
			});
		});

		async.mapLimit(items, 8, function (url, callback) {
			fetchUrl(url, callback);
		}, function (err, results) {
			console.log('done ', results.length);
			ep.emit('parse_result', results);
		});
	});
});

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

ep.on('save', function (collection) {
	var title = collection.title;
	var answers = collection.answers;
	var collectPath = './collection';

	createDir(collectPath, ep.done('create_dir')); 

	async.auto({
		mkdir: function (callback) {
			collectPath = path.resolve(collectPath, title);
			createDir(collectPath, callback);
		},
		write_file: ['mkdir', function (callback, result) {
			answers.forEach(function (answer) {
				var fileName = path.resolve(result.mkdir,
																		answer.id + '.html');
				console.log('file:', fileName);
				var outStream = fs.createWriteStream(fileName);
				pipe(outStream, [
					'<meta http-equiv="Content-Type" content="text/html;' +
					'charset=utf-8">',
					'<p id=\'author\'>' + answer.author + '</p>\n\n',
					'<p id=\'title\'>' + answer.title + '</p>\n\n',
					'<p id=\'content\'>' + answer.content + '</p>'],
					{end: true}, callback);
			});
		}]
	}, function (err, results) {
		console.log('err = ', err);
		console.log('results = ', results);
	});
});

function pipe(writeStream, content, opt, callback) {
	content.forEach(function (line) {
		writeStream.write(line);
	});

	if (opt && opt.end) {
		writeStream.end();
	}

	callback(null);
}

function createDir(path, callback) {
	fs.stat(path, function (err, stats) {
		if (err && err.code === 'ENOENT') { 
		 console.log('code:' + err.code + ' path:' + path);
		 try {
		 	fs.mkdirSync(path);
		 } catch(e) {
				if (e && e.code !== 'EEXIST') throw e;
		 }
		} else if (err) {
			console.log('createDir error:', err);
			callback(err);
			return;
		} else if (stats && !stats.isDirectory()) {
				fs.unlinkSync(collectPath);
				fs.mkdirSync(collectPath);
		 }
		callback(null, path);
		});
}


ep.fail(function (err) {
	throw err;
});
