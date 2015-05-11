showLivePreview = function(e) {

	var options = e.$options, container = e.$textarea, afterContainer = container
			.next(), replacementContainer = $('<div/>', {
		'class' : 'md-preview col-md-6',
		'data-provider' : 'markdown-preview'
	}), content

	// Give flag that tell the editor enter preview mode
	e.$isPreview = true
	// Disable all buttons
	// e.disableButtons('all').enableButtons('cmdLivePreview')

	content = e.parseContent()

	// Build preview element
	replacementContainer.html(content)

	if (afterContainer && afterContainer.attr('class') == 'md-footer') {
		// If there is footer element, insert the preview container before it
		replacementContainer.insertBefore(afterContainer)
	} else {
		// Otherwise, just append it after textarea
		container.parent().append(replacementContainer)
	}

	// Set the preview element dimensions
	container.css({
		width : container.outerWidth() / 2 + 'px',
		height : container.outerHeight() + 'px'
	})
	container.addClass("col-md-6")

	replacementContainer.css({
		width : container.outerWidth() + 'px',
		height : container.outerHeight() + 'px',
		
	})

	var sync = function(ev) {
		var $other = container.add(replacementContainer).not(this)
				.off('scroll'), other = $other.get(0);
		var percentage = this.scrollTop
				/ (this.scrollHeight - this.offsetHeight);
		other.scrollTop = percentage
				* (other.scrollHeight - other.offsetHeight);
		setTimeout( function(){ $other.on('scroll', sync ); },100);
	}
	container.add(replacementContainer).on('scroll', sync);

	if (e.$options.resize) {
		replacementContainer.css('resize', e.$options.resize)
	}

	// Hide the last-active textarea
	// container.hide()

	// Attach the editor instances
	replacementContainer.data('markdown', e)

	if (e.$element.is(':disabled') || e.$element.is('[readonly]')) {
		e.$editor.addClass('md-editor-disabled');
		e.disableButtons('all');
	}

	return e
}
hideLivePreview = function(e) {
	// Give flag that tell the editor quit preview mode
	e.$isPreview = false

	// Obtain the preview container
	var container = e.$editor.find('div[data-provider="markdown-preview"]')

	var textarea = e.$textarea

	textarea.css({
		width : '',
		height : ''
	})
	textarea.removeClass("col-md-6")
	textarea.off('scroll')

	// Remove the preview container
	container.remove()

	// Enable all buttons
	e.enableButtons('all')
	// Disable configured disabled buttons
	e.disableButtons(e.$options.disabledButtons)

	// Back to the editor
	e.$textarea.show()
	e.__setListener()

	return e
}

$(".content-editor").markdown(
		{
			onPreview : function(e) {
				var content = e.getContent()

				var html = markdown.toHTML(content)

				sanConfig = {
					allowedTags : [ 'p', 'em', 'strong', 'code', 'blockquote',
							'ul', 'li', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5',
							'h6', 'img', 'a' ],
				}

				clean = $.htmlClean(html, sanConfig)

				return clean
			},
			additionalButtons : [ [ {
				name : "groupUtil",
				data : [ {
					name : "cmdLivePreview",
					toggle : true, // this param only take effect if you load
					// bootstrap.js
					title : "Live Preview",
					icon : "glyphicon glyphicon-eye-open",
					callback : function(e) {

						// Check the preview mode and toggle based on this flag
						var isPreview = e.$isPreview

						if (isPreview == false) {
							// Give flag that tell the editor enter preview mode
							showLivePreview(e)
						} else {
							hideLivePreview(e)
						}
					}
				} ]
			} ] ],
			onChange : function(e) {
				var isPreview = e.$isPreview, content

				if (isPreview) {
					content = e.getContent()

					var html = markdown.toHTML(content)

					sanConfig = {
						allowedTags : [ 'p', 'em', 'strong', 'code',
								'blockquote', 'ul', 'li', 'ol', 'h1', 'h2',
								'h3', 'h4', 'h5', 'h6', 'img', 'a' ],
					}

					clean = $.htmlClean(html, sanConfig)

					var container = e.$editor
							.find('div[data-provider="markdown-preview"]')

					container.html(clean)
				}
			},
			onFullscreen : function(e) {
				// Check the preview mode and toggle based on this flag
				var isPreview = e.$isPreview

				if (isPreview) {
					
					hideLivePreview(e)
					
					showLivePreview(e)
				}
			}
		})