var mongoose = require('mongoose');

var peopleQuestionScheMa = mongoose.Schema({
	id: String,
	title: String,
	peopleId: String
});

var Question = function (db) {
	return db.model('peopleQuestion', peopleQuestionScheMa);
}

module.exports = Question;
