$(function () {
	var $link = $('#column2 ul > li > a');
	var $questions = $('#column1 > #questions >ul');
	$link.click(function (event) {
		$questions.empty();
		$elem = $(this);
		event.preventDefault();
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
	event.preventDefault();
	var $question = $('#questions ul >li >a');
	var $answer = $('#answer');
	$elem = $(this);
	$answer.empty();
	$answer.append('<h3>' + $elem.text() + '</h3>');

	$.get($elem.attr('href'), function (data, status) {
		if (status === 500) return; 
		data.forEach(function (answer) {
			var author = answer.author;
			var link = answer.href;
			var content = answer.content;

			$(document.createElement('div')).append(
				'<hr>' +
				'<p class="author">作者: ' + author  + '</p>' + 
				'<a href="http://www.zhihu.com'+ link + '">link</a>' + 
				'<p class="content">回答:' + content + '</p>' 
			).appendTo($answer);
		});
	});
}
