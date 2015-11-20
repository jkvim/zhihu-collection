var fs = require('fs');
var async = require('async');
var superagent = require('superagent');

var cookie = 'q_c1=054dd4783ced439980d6639228d89c1a|1445877742000|1445877742000; _za=d9c312b1-7d19-4a8e-861e-46a271b8b368; _xsrf=29cefffd4f78a27108c9eefdd3a9c160; cap_id="OTMwMTA5ZmU4YzlmNDNiYzhjNmFlYWIwYjM0Yzc5NDQ=|1447164656|ffb0c569046eea13dd9a221ef2c734dd4df0a14d"; z_c0="QUFDQTNFd2NBQUFYQUFBQVlRSlZUUi1JYVZhVHFFcWllRXJ2NEZ6ejhzNWR4YkdkYl9WdnNnPT0=|1447164703|2da46377ea2684f6491e86ef0c4106d22f52a096"; __utmt=1; __utma=51854390.285082120.1447940044.1447940044.1447940044.1; __utmb=51854390.4.10.1447940044; __utmc=51854390; __utmz=51854390.1447940044.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utmv=51854390.100-1|2=registration_date=20130709=1^3=entry_date=20130709=1';

var userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:41.0) Gecko/20100101 Firefox/41.0';

function pipe(writeStream, content) {
	var type = Object.prototype.toString.call(content);
	if (type  === '[object Array]') {
		content.forEach(function (line) {
			writeStream.write(line);
		});
	}

	if (type === '[object String]') {
			writeStream.write(content);
	}
}

function createDir(path, callback) {
	fs.stat(path, function (err, stats) {
		if (err && err.code === 'ENOENT') { 
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

// done(err, result)  
function tryCrawl(url, done) {
	async.retry({times: 5, interval: 1000}, function (callback, results) {
		superagent.get(url)	
		.timeout(2000)
		.set('User-Agent', userAgent)
		// .set('Cookie', cookie)
		.end(function (err, res) {
			if (err) {
				console.log(`fetch ${url} error ` + err);
				return callback(err);
			}

			if (res.status !== 200) { 
				return callback('GET fail, status is ' + res.status);
			}

			callback(null, res);
		});
	}, function (err, res) {
		if (err) {
			db.close();
			return done(err);
		}
		done(null , res);
	});
}

exports.cookie = cookie;
exports.userAgent = userAgent;
exports.pipe = pipe;
exports.createDir = createDir;
exports.tryCrawl = tryCrawl;
