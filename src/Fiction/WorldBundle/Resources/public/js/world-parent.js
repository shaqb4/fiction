/**
 * 
 */
var $collectionHolder;

// setup an "add a tag" link
var $addParentLink = $('<a href="#" class="add_world_parent_link btn btn-primary btn-sm">Add a Parent</a>');
var $newLinkLi = $('<li></li>').append($addParentLink);

jQuery(document).ready(function() {
	// Get the ul that holds the collection of tags
	$collectionHolder = $('ul.parents');

	// add a delete link to all of the existing parent form li elements
	$collectionHolder.find('li').each(function() {
		addParentFormDeleteLink($(this));
	});

	// add the "add a tag" anchor and li to the tags ul
	$collectionHolder.append($newLinkLi);

	// count the current form inputs we have (e.g. 2), use that as the new
	// index when inserting a new item (e.g. 2)
	$collectionHolder.data('index', $collectionHolder.find(':input').length);

	$addParentLink.on('click', function(e) {
		// prevent the link from creating a "#" on the URL
		e.preventDefault();

		// add a new tag form (see next code block)
		addParentForm($collectionHolder, $newLinkLi);
	});
});

function addParentForm($collectionHolder, $newLinkLi) {
	// Get the data-prototype explained earlier
	var prototype = $collectionHolder.data('prototype');

	// get the new index
	var index = $collectionHolder.data('index');

	// Replace '__name__' in the prototype's HTML to
	// instead be a number based on how many items we have
	var newForm = prototype.replace(/__name__/g, index);

	// increase the index with one for the next item
	$collectionHolder.data('index', index + 1);

	// Display the form in the page in an li, before the "Add a tag" link li
	var $newFormLi = $('<li></li>').append(newForm);
	$newLinkLi.before($newFormLi);

	addParentFormDeleteLink($newFormLi);
}

function addParentFormDeleteLink($parentFormLi) {
	var $removeFormA = $('<a href="#">X</a>');
	$parentFormLi.append($removeFormA);

	$removeFormA.on('click', function(e) {
		e.preventDefault();

		$parentFormLi.remove();
	});
}