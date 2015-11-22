var http = require('http');
var express = require('express');
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
var db = mongoose.createConnection('mongodb://localhost/zhihu');

var Answer = require('./models/answer.js')(db);
var Question = require('./models/question.js')(db);
var Collection = require('./models/collection.js')(db);
var Column = require('./models/column.js')(db);
var Post = require('./models/post.js')(db);

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
	var collectionPromise = new Promise(function (resolve) {
		Collection.find(function (err, raw) {
			var collections =  raw.map(function (element) {
				return {
					id: element.id,
					title: element.title,
				};
			});
			resolve(collections);
		});
	});

	var postPromise = new Promise(function (resolve) {
		 Column.find(function (err, raw) {
			var columns =  raw.map(function (element) {
				return {
					columnName: element.columnName,
					columnSlug: element.columnSlug,
				}
			});
			resolve(columns);
		});
	});

	Promise.all([collectionPromise, postPromise])
	.then(function (results) {
		 res.render('home', {collections: results[0],
		 										 posts: results[1]});
	})
	.catch(function (error) {
		console.log(error);
		res.render('500');
	});
});

//获取问题答案
app.get('/question/:id/', function (req, res) {
	var id = req.params.id;

	new Q().then(function () {
		return Answer.find({questionId: id}, function (err, raw) {
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
}

app.get('/post/:slug', function (req, res) {
	var slug = req.params.slug;	

	new Q().then(function () {
		return Post.find({postSlug: slug}, function (err, raw) {
			return raw;
		});
	})
	.then(function (raw) {
		return raw.map(function (element) {
			return {
				slug: element.postSlug,
				author: element.author,
				titleImage: element.titleImage,
				content: element.content,
			};
		});
	})
	.then(function (post) {
		res.status(200)
			.send(post);
	})
	.catch(function (error) {
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

