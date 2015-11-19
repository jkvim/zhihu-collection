var mongoose = require('mongoose');
var answerScheMa = mongoose.Schema({
	author: String,
	authorLink: String,
	answerLink: String,
	content: String,
	editTime: String,
	questionId: String
});

// model auto to puarl, so it create 'answers' collection
var Answer = mongoose.model('answers', answerScheMa);
module.exports = Answer;
