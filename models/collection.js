var mongoose = require('mongoose');

var collectionScheMa = mongoose.Schema({
	id: String,
	title: String
});

var Collection = function (db) {
	return db.model('collections', collectionScheMa);
}

module.exports = Collection;
