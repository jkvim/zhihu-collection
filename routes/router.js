var Q = require('q');
var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var MONGO_HOST = process.env.MONGO_HOST || 'localhost';
var MONGO_PORT = process.env.MONGO_PORT || '27017';
var db = mongoose.createConnection('mongodb://' + MONGO_HOST + ':' + MONGO_PORT + 'zhihu');

var Answer = require('../models/answer.js')(db);
var Question = require('../models/question.js')(db);
var Collection = require('../models/collection.js')(db);
var Column = require('../models/column.js')(db);
var Post = require('../models/post.js')(db);
var People = require('../models/people.js')(db);
var PeopleQuestion = require('../models/people_question.js')(db);
var PeopleAnswer = require('../models/people_answer.js')(db);


router.get('/', function (req, res) {
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
router.get('/collection/:id', function (req, res) {
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
router.get('/question/:id', function (req, res) {
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
router.get('/column/:slug', function (req, res) {
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
router.get('/post/:slug', function (req, res) {
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
router.get('/people/:name', function (req, res) {
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
router.get('/people/:name/question/:id', function (req, res) {
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

module.exports = router;
