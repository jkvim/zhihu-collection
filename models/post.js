var mongoose = require('mongoose');
var postSchema = mongoose.Schema({
	uid: String,
	slug: String,
	author: String,
	title: String,
	content: String,
	url: String,
});

var Post = mongoose.model('posts', postSchema);
module.exports = Post;
