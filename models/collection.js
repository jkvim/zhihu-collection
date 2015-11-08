var mongoose = require('mongoose');

var collectionScheMa = mongoose.Schema({
	id: String,
	title: String
});

var Collection = mongoose.model('collections', collectionScheMa);
module.exports = Collection;
