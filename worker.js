var http = require('http');
var express = require('express');
var Answer = require('./models/answer.js');
var Question = require('./models/question.js');
var Collection = require('./models/collection.js');
var Q = require('q');
var app = express();

var handlebars = require('express-handlebars').create({
	defaultLayout: 'main',
	helpers: {
		static: function (name) {
			return require('./lib/static.js').map(name);
		}
	}
});

var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/zhihu');

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
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

app.use(express.static(__dirname + '/public'));

app.use(function (req, res, next) {
	var cluster = require('cluster');
	if (cluster.isWorker) console.log('Worker %d receive request', cluster.worker.id);
	next();
});

app.get('/', function (req, res) {
	new Q().then(function () {
		return Collection.find(function (err, raw) {
			return raw;
		});
	})
	.then(function (raw) {
		return raw.map(function (element) {
			return {
				id: element.id,
				title: element.title
			};
		});
	})
	.then(function (collections) {
		res.render('home', {collections: collections});
	})
	.fail(function (error) {
		console.log(error);
		res.render('500');
	});
});

app.get('/collection/:id', function (req, res) {
	var id = req.params.id;

	new Q().then(function () {
		return Question.find({parentId: id}, function (err, raw) {
			return raw;
		});
	 })
	 .then(function (raw) {
		 return raw.map(function (element){
			 return {
				 id: element.id,
				 title: element.title,
				 parentId: element.parentId};
		 });
	 })
	 .then(function (questions) {
		 res.status(200);
		 res.send(questions);
	 })
	 .fail(function (error) {
		 console.log(error);
		 res.render('500');
	 });
});

app.get('/question/:id/', function (req, res) {
	var id = req.params.id;

	new Q().then(function () {
		return Answer.find({parentId: id}, function (err, raw) {
			return raw;
		});
	})
	.then(function (raw) {
		return raw.map(function (element) {
			return {
				author: element.author,
				authorLink: element.authorLink,
				answerLink: element.answerLink,
				content: element.content
			};
		});
	})
	.then(function (answers) {
		res.status(200)
		   .send(answers)
	})
	.fail(function (error) {
		console.log(error);
		res.render('500');
	});

});


app.use(function (err, req, res, next) {
	console.log('in err');
	console.log(err);
	res.status(500).render('500');
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

