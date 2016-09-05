var crawler = require('./lib/collection_spider.js');
var postSpider = require('./lib/column_spider.js');
var answerSpider = require('./lib/answer_spider.js');

// 爬去一个收藏夹
crawler.getOne('http://www.zhihu.com/collection/73284137');

// 爬去一个人的所有收藏夹
crawler.getAll('http://www.zhihu.com/people/xiao-yan-jing-43/collections');

// 爬去一个专栏的所有文章
postSpider.getAllPosts('http://zhuanlan.zhihu.com/koiwai1018');

// 爬去一篇文章
postSpider.getOnePost('http://zhuanlan.zhihu.com/p/20357464');

// 爬取一篇答案, 可以通过浏览器的审查元素功能获取url, 或者通过作者主页的回答
answerSpider.getAnswer('www.zhihu.com/question/23835093/answer/25872501'); // test anonymous


answerSpider.getAnswer('http://www.zhihu.com/question/37693731/answer/73163568'); // test non-anonymous
