var http = require('http');
var express = require('express');
var app = express();


app.set('port', 3000);

app.use(function (req, res, next) {
	var domain = require('domain').create();

	domain.on('error', function (err) {
		console.log('DOMAIN ERROR CAUGHT\n', err);
		try {
			// 5秒退出时间
			setTimeout(function() { 
				console.log('Failsafe shutdown');
				process.exit(1);
		 	}, 5000);

			var worker = require('cluster').worker;
			if (worker) woker.disconnect();

			server.close();

			try {
				next(err);
			} catch(e) {
				console.log('Express error deal fail\n', e);
				res.statusCode = 500;
				res.setHeader({'Content-Type': 'text/plain'});
				res.end('Server error');
			} 
		} catch(e) {
			console.log('Unable to send 500 response');
		}
	});

	domain.add(req);
	domain.add(res);
	domain.run(next);
});

app.use('/', function (req, res, next) {
	console.log('not done');
	next();
});

app.use('/fail', function (req, res) {
	throw new Error('Nope');
});

app.use(function (err, req, res, next) {
	console.log(err.statck);
	res.status(500).render('500');
});

app.use(function (req, res, next) {
	var cluster = require('cluster');
	if (cluster.isWorker) console.log('Worker %d receive request', cluster.worker.id);
});

function startServer() {
	var server = http.createServer(app).listen(app.get('port'), function () {
		console.log('Express listen on ' + app.get('port'));
	});

	return server;
}

if (require.main === module) {
	var server = startServer();
} else {
	module.exports = startServer;
}

