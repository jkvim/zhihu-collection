var mongoose = require('mongoose');
var columnSchema = mongoose.Schema({
	columnName: String,
	columnSlug: String,
});

var Column = function (db) {
	return db.model('columns', columnSchema);
}
module.exports = Column;
