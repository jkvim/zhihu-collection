var mongoose = require('mongoose');

var PeopleSchema = mongoose.Schema({
	name: String,
	url: String,
});

var People = function (db) {
	return db.model('people', PeopleSchema);
}

module.exports = People;
