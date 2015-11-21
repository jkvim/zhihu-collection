var crawler = require('./lib/collection_spider.js');
var postSpider = require('./lib/column_spider.js');
var answerSpider = require('./lib/answer_spider.js');

// crawler.getOne('http://www.zhihu.com/collection/69195487');

// crawler.getAll('http://www.zhihu.com/people/xiao-yan-jing-43/collections');

// postSpider.getAllPosts('http://zhuanlan.zhihu.com/koiwai1018');

// postSpider.getOnePost('http://zhuanlan.zhihu.com/wontfallinyourlap/20357464');
// answerSpider.getAnswer('www.zhihu.com/question/23835093/answer/25872501'); // test anonymous

answerSpider.getAnswer('http://www.zhihu.com/question/37693731/answer/73163568'); // test non-anonymous
