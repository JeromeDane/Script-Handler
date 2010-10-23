/* Blank Canvas Script Handler [http://blankcanvas.me/contact/]
 * Copyright (c) 2009, 2010 Jerome Dane <http://blankcanvas.me/contact/>  
 * 
 * This file is part of the Blank Canvas Script Handler. See readme.md for
 * more information, credits, and author requests. 
 * 
 * BC Script Handler is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
 
var currentScriptChanged = false;
var scriptListUpdated = false;
function showTab(tab) {
	$('#optionsTabs div').attr('class', '');
	$('#optionsWindow .tabContent').hide();
	$('#' + tab.id + 'Content').show();
	$('#' + tab.id).attr('class', 'active');
	if (tab.id != 'tabList') {
		$('#editScriptButtonWrapper').hide();
		if (!$('#tabList').text().match(/Installed/i) && !currentScriptChanged) 
			hideEdit(false);
	}
	else {
		if (!tab.innerHTML.match(/Installed/i)) 
			$('#editScriptButtonWrapper').show();
		else if(!scriptListUpdated)
			document.location = document.location;
	}
}

function insertAtCaret(txtarea,text) {
    var scrollPos = txtarea.scrollTop;
    var strPos = 0;
    var br = ((txtarea.selectionStart || txtarea.selectionStart == '0') ? 
        "ff" : (document.selection ? "ie" : false ) );
     strPos = txtarea.selectionStart;

    var front = (txtarea.value).substring(0,strPos);  
    var back = (txtarea.value).substring(strPos,txtarea.value.length); 
    txtarea.value=front+text+back;
    strPos = strPos + text.length;
    if (br == "ie") { 
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart ('character', -txtarea.value.length);
        range.moveStart ('character', strPos);
        range.moveEnd ('character', 0);
        range.select();
    }
    else if (br == "ff") {
        txtarea.selectionStart = strPos;
        txtarea.selectionEnd = strPos;
        txtarea.focus();
    }
    txtarea.scrollTop = scrollPos;
}

function showSavingNotice() {
	$('#savingNotice').css('display', 'inline');
	$('#editScriptButtonWrapper').hide();
}
function showSaveButtons() {
	currentScriptChanged = true;
	$('#editButtonsWrrapper').show();
	$('#editCloseButtonLabel').html('Cancel');
	$('#closeScriptIcon').attr('src', chrome.extension.getURL("images/delete.png"));
	$('#saveScriptButton').css('display', 'inline');
	$('#saveCloseScriptButton').css('display', 'inline');
	$('#savingNotice').css('display', 'none');
}
function hideSaveButtons() {
	currentScriptChanged = false;
	$('#editButtonsWrrapper').css('display', 'inline');
	$('#editCloseButtonLabel').html('Close');
	$('#closeScriptIcon').attr('src', chrome.extension.getURL("images/door_in.png"));
	$('#saveScriptButton').css('display', 'none');
	$('#saveCloseScriptButton').css('display', 'none');
	$('#savingNotice').css('display', 'none');
}


function parseScriptField(field) {
	return field ? field : '-';
}
function moveScriptDown(script) {
	var scripts = getScripts();
	if(script.id < scripts.length) {
		var nextScript = getScriptById(script.id + 1);
		if(nextScript) {
			nextScript.id--;
			saveScript(nextScript);
		}
		script.id++;
		saveScript(script);
		redrawScriptList();
	}
}
function moveScriptUp(script) {
	if(script.id > 1) {
		var previousScript = getScriptById(script.id - 1);
		if(previousScript) {
			previousScript.id++;
			saveScript(previousScript);
		}
		script.id--;
		saveScript(script);
		redrawScriptList();
	}
}
// duplicate header
function updateScriptListMaxHeight(){
	var wrapper = $('#scriptTableWrapper');
	wrapper.css('max-height', maxListHeight + 'px');
	if (wrapper.height() == maxListHeight) {
		$('#scriptListHead').html($('table', wrapper).html());
		$('#scriptListHead').css('width', $('table', wrapper).width() + 'px');
		$('#scriptListHead td img').attr('id', '');
		$('#scriptListHead td input').attr('id', '');
	}
}
// show loaded scripts
function redrawScriptList() {
	var scripts = getScriptsSorted();
	if(scripts.length > 0) {
		$('#scriptsFoundWrapper').css('display', 'block');
		$('#noScriptsWrapper').css('display', 'none');
		var wrapper = $('#scriptTableWrapper');
		wrapper.html('');
		var table = $(document.createElement('table'));
		table.attr('cellpadding', '0');
		table.attr('cellspacing', '0');
		table.html('<tr id="scriptListHeadTemplate"><th>Name</th>' +
					(getOption('showVersions', true) ? '<th>Version</th>' : '') +
					(getOption('showSites', true) ? '<th>Sites</th>' : '') +
					(getOption('showFeatures', true) ? '<th>Features</th>' : '') +
					'<th class="center">Enabled</th><th class="center">Order</th><th class="center">Edit</th><th class="center">Delete</th></tr>');
		var incompatibleFound = false;
		var highestOrder = getHighestScriptOrder();
		for(var i = 0; i < scripts.length; i++) {
			var script = scripts[i];
			if(script.complete) {
				var tr = $(document.createElement('tr'));
				if(i%2 != 0) tr.attr('class', 'even');
				tr.append('<td title="' + script.description.replace(/"/g, '&quot;') + '">' + (script.website ? '<a href="' + script.website + '" target="_blank">' + script.name +'</a>' : script.name) + '</td>' +
						  (getOption('showVersions', true) ? '<td title="' + script.version + '"><div style="max-width:50px; white-space: nowrap; overflow:hidden;">' + script.version + '</td>' : '')+
						  (getOption('showSites', true) ? '<td style="max-width:100px; white-space: nowrap; overflow:auto;">' + script.siteIcons + '</td>' : '')+
						  (getOption('showFeatures', true) ? '<td>' + script.featureIcons + '</td>' : '') +
						  '<td class="center"><input id="scriptEnabled_' + script.id + '" type="checkbox" '+ (script.enabled ? 'checked' : '') +'/></td>' +
						  '<td class="center">' +
						  	'<img id="moveScriptUp_' + script.id + '" src="' + chrome.extension.getURL("images/bullet_arrow_up.png") + '" class="iconButton" title="Move script up in list" style="visibility:' + (i > 0 ? 'visible' : 'hidden') + '"/>' +
						  	'<img id="moveScriptDown_' + script.id + '" src="' + chrome.extension.getURL("images/bullet_arrow_down.png") + '" class="iconButton" title="Move script down in list" style="margin-left:-2px; visibility:' + (i < scripts.length - 1 ? 'visible' : 'hidden') + '"/>' +
						  '</td>' +
						  '<td class="center"><img id="editScript_' + script.id + '" src="' + chrome.extension.getURL("images/edit.png") + '" class="iconButton"/></td>' +
						  '<td class="center"><img id="deleteScript_' + script.id + '" src="' + chrome.extension.getURL("images/trash.png") + '" class="iconButton"/></td>' +
						  '');
				table.append(tr);
			} else
				script.remove();
		}
		wrapper.append(table);
		if(parseInt(table.height()) > maxListHeight) {
			function hideHeader() {
				$('th', table).each(function() {
					this.innerHTML = '<div style="height:0; overflow:hidden;">' + this.innerHTML + '</div>';
					this.style.borderBottom = 'none';
					this.style.paddingTop = '0';
					this.style.paddingBottom = '0';
				});
			}
			if ($('#scriptListHead tr').size() > 0) 
				hideHeader();
			else 
				setTimeout(hideHeader, 10);
		}
		// add event listeners
		for(var i = 0; i < scripts.length; i++) {
			$('#moveScriptUp_' + scripts[i].id).click(function(evt) {
				var id = this.id.match(/\d+$/)[0];
				var script = new Script(id);
				script.moveUp();
			});	
			$('#moveScriptDown_' + scripts[i].id).click(function(evt) {
				var id = this.id.match(/\d+$/)[0];
				var script = new Script(id);
				script.moveDown();
			});	
			$('#scriptEnabled_' + scripts[i].id).change(function(evt) {
				var id = this.id.match(/\d+$/)[0];
				var script = new Script(id);
				script.enabled = this.checked;
				script.saveRecord();
			});	
			$('#editScript_' + scripts[i].id).click(function(evt) {
				var id = this.id.match(/\d+$/)[0];
				var script = new Script(id);
				editScript(script);
			});	
			$('#deleteScript_' + scripts[i].id).click(function(evt) {
				var id = this.id.match(/\d+$/)[0];
				var script = new Script(id);
				var c = confirm('Are you sure you want to uninstall "' + script.name + '"?');
				if(c) {
					script.remove();
					redrawScriptList();
				}
			});			
		}
	} else {
		$('#scriptsFoundWrapper').css('display', 'none');
		$('#noScriptsWrapper').css('display', 'block');
	}
	scriptListUpdated = true;
}
function newScript() {
	$('#newScriptButton').hide();
	showTab($('#tabList')[0]);
	var script = new Script();
	script.source = "// ==UserScript==\n" + 
					"// @name           " + getOption("defaultScriptName", "My Script") + "\n" + 
					"// @description    " + getOption("defaultDescription", "A brief description of your script") + "\n" +
					"// @author         " + getOption('defaultAuthor', 'Your Name') + "\n" +
					"// @include        " + getOption('defaultInclude', 'http://*') + "\n" +
					"// @version        " + getOption('defaultVersion', '1.0') + "\n" +
					"// ==/UserScript==\n\n";
	script.complete = true;
	script.enabled = true;
	editScript(script);
	showSaveButtons();
	currentScriptChanged = false;	// no changes since it was just created
}
function toggleSourceCollapsed(target) {
	var editBox = $(target).next();
	var isCollapsed = editBox.css('display') == 'none';
	if(isCollapsed) {
		editBox.show();
		target.title = 'Hide ' + $(target).text();
		$('img', target).attr('src', chrome.extension.getURL("images/bullet_collapse.png"));
		editBox[0].focus();
	} else {
		editBox.hide();
		target.title = 'Edit ' + $(target).text();
		$('img', target).attr('src', chrome.extension.getURL("images/bullet_expand.png"));
	}
}
function textareaKeyHandler(event) {
	switch(event.which) {
		case 9:
			event.preventDefault();
			insertAtCaret(event.target, "\t");
			showSaveButtons();
			break;
		case 83:
			if(event.ctrlKey) {
				event.preventDefault();
				saveCurrentScript();
			} else
				showSaveButtons();
				return true;
			break;
		default:
			showSaveButtons();
			return true;
	}
}
var previousRequires
function editScript(script) {
	if(script.id) 
		$('#newScriptButton').hide();
	$('#editScriptButtonWrapper').show();
	$('#tabList').html(script.id ? 'Edit Script' : 'New Script');
	hideSaveButtons();
	currentScript = script;
	$('#editScriptWrapper').css('display', 'block');
	$('#scriptListWrapper').css('display', 'none');
	$('#scriptEditor').html(script.source.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
	// show @require scripts
	$('#editRequiresWrapper').html('');
	updateRequireList();
	updateResourceList();
}
function updateResourceList(){
	var script = currentScript;
	var resources = script.resources;
	if(resources.length == 0)
		$('#resourceListWrapper').hide();
	else {
		$('#resourceListWrapper').show();
		$('#resourceListImageWrapper').html('');
		for(var i = 0; i < resources.length; i++) {
			if(resources[i].data.match(/^data:image/))	{
				if($('#resourceExample_' + resources[i].key).size() == 0)
					$('#resourceListImageWrapper').append('<img id="resourceExample_' + resources[i].key + '" src="' + resources[i].data + '" title="GM_getResourceURL(\'' + resources[i].key + '\')"/>');
				else
					$('#resourceListImageWrapper').attr('src', resources[i].data);
			}
		}
	}
	
}
function updateRequireList() {
	var script = currentScript;
	var requireUrls = currentScript.requireUrls;
	if(requireUrls.length == 0)
		$('#requireListWrapper').hide();
	else
		$('#requireListWrapper').show();
	for(var i = 0; i < requireUrls.length; i++) {
		var source = script.getRequireSourceByUrl(requireUrls[i]); 
		if (source != null && $('#editRequiresWrapper p[name="toggler_' + requireUrls[i] + '"]').size() == 0) {
			$('#editRequiresWrapper').append('<p name="toggler_' + requireUrls[i] + '" onclick="toggleSourceCollapsed(this)" title="Edit ' + requireUrls[i] + '"><img src="' + chrome.extension.getURL("images/bullet_expand.png") + '"/> ' + requireUrls[i] + '</p>' +
											 '<textarea wrap="off" name="' + requireUrls[i] + '" id="require_' + requireUrls[i] + '" style="display:none;">' + source.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>');
			$('#editRequiresWrapper textarea[name="' + requireUrls[i] + '"]').keydown(textareaKeyHandler);
		}
	}
	// remove any no longer used
	$('#editRequiresWrapper p').each(function(i) {
		var url = $(this).attr('name').replace(/^toggler_/, '');
		if(script.getRequireSourceByUrl(url) == null) {
			$(this).next().remove();
			$(this).remove();
		}
		
	});
}
function hideEdit(redrawList) {
	currentRequire = {};
	$('#editScriptButtonWrapper').hide();
	$('#newScriptButton').show();
	$('#tabList').html('Installed Scripts');
	$('#editScriptWrapper').css('display', 'none');
	$('#scriptListWrapper').css('display', 'block');
	if(typeof(redrawList) == 'undefined' || redrawList) redrawScriptList();
}

function saveCurrentScript(callback) {
	scriptListUpdated = false;
	$('#tabList').html('Edit Script');
	showSavingNotice();
	
	var source = $('#scriptEditor').attr('value');
	
	// save requires
	var requireUrls = currentScript.requireUrls;
	for(var i = 0; i < requireUrls.length; i++) {
		var textarea = $('textarea[name="' + requireUrls[i] + '"]');
		if(textarea.size() == 1) {
			currentScript.setRequireSourceByUrl(requireUrls[i], textarea.attr('value'));
		}
	}	
	
	setTimeout(function() {
		currentScript.source = source;
		currentScript.save(function() {
			hideSaveButtons();
			$('#editScriptButtonWrapper').show();
			if (typeof(callback) == 'function' && !currentScript.errors) 
				callback();
			else {
				updateRequireList();
				updateResourceList();
			}
		});
	}, 100)
}

// clean up stagnant requires
for(var i=0; i < localStorage.length; i++) {
	var key = localStorage.key(i);
	var matches = key.match(/^@require_(\d+)_/);
	if(matches) {
		var script = getScriptById(matches[1]);
		if(typeof(script.id) == 'undefined')
		localStorage.removeItem(key);
	}
}

