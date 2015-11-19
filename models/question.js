var mongoose = require('mongoose');

var questionScheMa = mongoose.Schema({
	id: String,
	title: String,
	collectionId: String
});

var Question = mongoose.model('questions', questionScheMa);
module.exports = Question;
