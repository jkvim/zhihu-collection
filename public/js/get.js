// get list of questions or posts
$(function () {
	var $link = $('#column2 ul > li > a');
	var $questions = $('#column1 > #questions >ul');
	var $answers = $('#answers');

	$link.click(function (event) {
		$elem = $(this);
		event.preventDefault();
		$questions.empty();
		$answers.empty();

		$.get($elem.attr('href'), function (data, status) {
			if (status === 500) return;
			data.forEach(function (item) {
				appendList(item, $questions);
			});
		});
	});
});

function appendList(item, $parent) {
	var title = item.title;
	var id = item.id || item.slug;
	var path = item.slug ? '/post/' : '/question/'
	$parent.append(
		$(document.createElement('li')).append(
			$(document.createElement('a'))
			.attr('href', `${path}${id}`)
			.text(title)
			.on('click', item, showAnswer)));
}

//
function showAnswer(event) {
	var $answers = $('#answers');
	$elem = $(this);
	var item = event.data;
	var questionHref = $elem.attr('href');
	if (item.slug) {
		var sourceHref =  item.url;
	} else {
		var sourceHref = 'http://www.zhihu.com' + questionHref;
	}

	event.preventDefault();

	$answers.empty();
	$(document.createElement('a'))
	  .attr('href', sourceHref)
		.attr('target', '_blank')
		.attr('id', 'title')
		.text($elem.text())
		.appendTo($answers);
				 

	$.get(questionHref, function (data, status) {
		if (status === 500) return; 
		data.forEach(function (item) {
			if (item.slug) {
				addPost(item).appendTo($answers);
			} else {
				addAnswer(item).appendTo($answers);
			}
		});

	// redirect to answer
	window.location.href = '#answers';
	});
}

function addPost(post) {
	var	content = post.content;
	var titleImage = post.titleImage;

	var $post = $(document.createElement('div'))
							 .addClass('post-item')
							 .append(
							  '<hr>' + 
								'<div><img src="' + titleImage + '"></div>' + 
								'<div class="content">' + content + '</div>');
	return $post;
}

function addAnswer(answer) {
	var author = answer.author;
	var answerLink = answer.answerLink;
	var content = answer.content;
	var authorLink = answer.authorLink;

	var $answer =  $(document.createElement('div'))
	.addClass('answer-item')
	.append(
		'<hr>' +
			'<a href=http://www.zhihu.com' + authorLink + ' class="author">作者: ' + author  + '</a>' + 
		'<a href=http://www.zhihu.com'+ answerLink + ' class="answer">link</a>' + 
		'<div class="content">' + content + '</div>' 
	);

	return $answer;
}

// show bottom-line
$(function () {
	$('#column2 a').click(function () {
		$('#column2 a').removeClass('active');
		$(this).addClass('active');
	});
});

// toggle list animation
$(function () {
	$('.toc-title').click(function () {
		$(this).next('.toc-list').stop(true, true).slideToggle('slow');
	});
});

// back to top


$(function(){

	$(document).on( 'scroll', function(){

		if ($(window).scrollTop() > 100) {
			$('.scroll-top-wrapper').addClass('show');
		} else {
			$('.scroll-top-wrapper').removeClass('show');
		}
	});
	$('.scroll-top-wrapper').on('click', scrollToTop);
});

 
function scrollToTop() {
	verticalOffset = typeof(verticalOffset) != 'undefined' ? verticalOffset : 0;
	element = $('body');
	offset = element.offset();
	offsetTop = offset.top;
	$('html, body').animate({scrollTop: offsetTop}, 500, 'linear');
}
