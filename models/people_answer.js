var mongoose = require('mongoose');
var peopleAnswerScheMa = mongoose.Schema({
	answerLink: String,
	content: String,
	questionId: String
});

var PeopleAnswer = function (db) {
	return db.model('peopleAnswers', peopleAnswerScheMa);
}

module.exports = PeopleAnswer;
