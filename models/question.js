var mongoose = require('mongoose');

var questionScheMa = mongoose.Schema({
	id: String,
	title: String,
	collectionId: String
});

var Question = function (db) {
	return db.model('questions', questionScheMa);
}

module.exports = Question;
