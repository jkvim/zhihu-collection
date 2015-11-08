var fs = require('fs');

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

exports.pipe = pipe;
exports.createDir = createDir;
