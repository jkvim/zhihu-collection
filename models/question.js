var mongoose = require('mongoose');

var questionScheMa = mongoose.Schema({
	id: String,
	title: String,
	parentId: String
});

var Question = mongoose.model('questions', questionScheMa);
module.exports = Question;
