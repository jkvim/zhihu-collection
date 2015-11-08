var mongoose = require('mongoose');
var answerScheMa = mongoose.Schema({
	author: String,
	href: String,
	content: String,
	editTime: String,
	parentId: String
});

// model auto to puarl, so it create 'answers' collection
var Answer = mongoose.model('answers', answerScheMa);
module.exports = Answer;
