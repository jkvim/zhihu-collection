var fs = require('fs');
var async = require('async');
var superagent = require('superagent');

var cookie = ''; // 有些收藏夹需要设置Cookie才能抓取 

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
