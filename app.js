var crawler = require('./lib/collection_spider.js');
var postSpider = require('./lib/column_spider.js');

// crawler.getOne('http://www.zhihu.com/collection/69195487');

// crawler.getAll('http://www.zhihu.com/people/xiao-yan-jing-43/collections');

postSpider.getAllPosts('http://zhuanlan.zhihu.com/koiwai1018');
