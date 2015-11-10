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
			data.forEach(function (question) {
				var title = question.title;
				var id = question.id;
				$questions.append(
				$(document.createElement('li')).append(
				$(document.createElement('a'))
				  .attr('href', '/question/' + id)
					.text(title)
					.on('click', showAnswer)));
			});
		});
	});

});

function showAnswer(event) {
	var $answers = $('#answers');
	$elem = $(this);
	var questionHref = $elem.attr('href');
	var sourceHref = 'http://www.zhihu.com' + questionHref;

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
		data.forEach(function (answer) {
			var author = answer.author;
			var answerLink = answer.answerLink;
			var content = answer.content;
			var authorLink = answer.authorLink;

			$(document.createElement('div'))
			.addClass('answer-item')
			.append(
				'<hr>' +
				'<a href=http://www.zhihu.com' + authorLink + ' class="author">作者: ' + author  + '</a>' + 
				'<a href=http://www.zhihu.com'+ answerLink + ' class="answer">link</a>' + 
				'<div class="content">' + content + '</div>' 
			).appendTo($answers);
		});
	// redirect to answer
	window.location.href = '#answers';
	});
}

$(function () {
	$('#column2 a').click(function () {
		$('#column2 a').removeClass('active');
		$(this).addClass('active');
	});
});
