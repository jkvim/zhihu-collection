var mongoose = require('mongoose');
var postSchema = mongoose.Schema({
	columnSlug: String,
	postSlug: String,
	author: String,
	title: String,
	titleImage: String,
	url: String,
	content: String,
});

var Post = function (db) {
	return db.model('posts', postSchema);
}

module.exports = Post;
