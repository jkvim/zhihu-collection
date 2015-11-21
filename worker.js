var http = require('http');
var express = require('express');
var Q = require('q');
var app = express();
var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://localhost/zhihu');

var Answer = require('./models/answer.js')(db);
var Question = require('./models/question.js')(db);
var Collection = require('./models/collection.js')(db);
var Column = require('./models/column.js')(db);
var Post = require('./models/post.js')(db);
var People = require('./models/people.js')(db);
var PeopleQuestion = require('./models/people_question.js')(db);
var PeopleAnswer = require('./models/people_answer.js')(db);

var handlebars = require('express-handlebars').create({
	defaultLayout: 'main',
	helpers: {
		static: function (name) {
			return require('./lib/static.js').map(name);
		}
	}
});

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
	var collections = new Promise(function (resolve) {
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

	var posts = new Promise(function (resolve) {
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

	var people = new Promise(function (resolve) {
		People.find(function (err, raw) {
			var res = raw.map(function (element) {
				return {
					name: element.name,
					url: element.url,
				};
			});
			resolve(res);
		})
	});

	Promise.all([collections, posts, people])
	.then(function (results) {
		 res.render('home', {collections: results[0],
		 										 posts: results[1],
							  				 people: results[2]});
	})
	.catch(function (error) {
		console.log(error);
		res.render('500');
	});
});

//获取问题列表
app.get('/collection/:id', function (req, res) {
	var id = req.params.id;

	new Q().then(function () {
		return Question.find({collectionId: id}, function (err, raw) {
			return raw;
		});
	 })
	 .then(function (raw) {
		 return raw.map(function (element){
			 return {
				 id: element.id,
				 title: element.title
			 };
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

//获取收藏夹问题答案
app.get('/question/:id', function (req, res) {
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

});

//获取文章列表
app.get('/column/:slug', function (req, res) {
	var slug = req.params.slug;

	new Q().then(function () {
		return Post.find({columnSlug:slug}, function (err, raw) {
			return raw;	
		});
	})
	.then(function (raw) {
		return raw.map(function (element) {
			return {
				slug: element.postSlug,
				title: element.title,
				url: element.url,
			};
		});
	})
	.then(function (posts) {
		res.status(200)
		 .send(posts)
	})
	.fail(function (error) {
		console.log(error);
		res.render('500');
	});
});

//获取文章内容
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

// 获取个人回答问题列表
app.get('/people/:name', function (req, res) {
	var name = req.params.name;
	new Q().then(function () {
		return PeopleQuestion.find({peopleId: name}, function (raw) {
			return raw;
		});
	})
	.then(function (raw) {
		return raw.map(function (element) {
			return {
				id: element.id,
				title: element.title,
				peopleId: element.peopleId,
			};
		});
	})
	.then(function (questions) {
		res.status(200)	
		 .send(questions);
	})
	.catch(function (error) {
		console.log(error);
		res.render(500);
	});
});

// 获取个人回答内容
app.get('/people/:name/question/:id', function (req, res) {
	var questionId = req.params.id;
	new Q().then(function () {
		return PeopleAnswer.find({questionId: questionId}, function (raw) {
			return raw;
		});	
	})
	.then(function (raw) {
		return raw.map(function (element) {
			return {
				url: element.answerLink,
				content: element.content,
			};
		});
	})
	.then(function (answer) {
		res.status(200)
		 .send(answer);
	})
	.catch(function (error) {
		console.log(error);
		res.render(500);
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

