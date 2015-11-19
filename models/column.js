var mongoose = require('mongoose');
var columnSchema = mongoose.Schema({
	uid: String,
	title: String
});

var Column = mongoose.model('columns', columnSchema);
module.exports = Column;
