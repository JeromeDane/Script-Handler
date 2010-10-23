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
 
var bcshNotice = null;
var bcScriptHandlerInstallNotice = {
	origBodyTopMargin:0,
	show:function(scriptName) {
		$('#bcScriptHandlerNoticeWrapper').remove();
		$('body').append('<div id="bcScriptHandlerNoticeWrapper" style="background:url(' + chrome.extension.getURL("images/dropshadow.png") + ') bottom repeat-x; height:0; position:fixed; top:0; left:0; width:100%;"><div style="' +
			'border-bottom:1px solid #80a8ce; background-color:#dee9f7; color:#333; width:100%;">' +
				'<style type="text/css">\
					.bcInstallNoticeButton { cursor:pointer; float:right; padding:5px; border:1px outset #ccc;\
							 background:#eee; margin:5px; margin-right:8px; -webkit-border-radius: 4px; }\
					#bcScriptHandlerNoticeWrapper * { font-weight:normal; font-size:14px; font-family:arial, helvetica, sans-serif; }		 \
				</style>' +
				'<div style="line-height:40px;" id="bcInstallNoticeInnerWrapper"><img src="' + chrome.extension.getURL("images/icon.png") + '" style="float:left; height:30px; margin:5px 10px 5px 7px;"/>' +
				'Installing "' + scriptName + '" ' +
				'<img id="bcInstallNoticeLoadingAnim" src="' + chrome.extension.getURL("images/loading_blue.gif") + '" style="vertical-align:middle; margin:0 20px;"/> <span id="bcInstallNoticeMessage" style="margin-left:20px;"></span></div>' +
				
			'</div></div>');
		bcshNotice.origBodyTopMargin = $('body').css('margin-top');
		$('#bcScriptHandlerNoticeWrapper').animate({ height:'43px' }, 300, function() {});
	},
	showCloseButton:function() {
		$('#bcInstallNoticeLoadingAnim').remove();
		$('#bcInstallNoticeInnerWrapper').prepend('<img class="bcInstallNoticeButton" id="bcInstallNoticeCloseButton" src="' + chrome.extension.getURL("images/door_in.png") + '" title="Close"/>')
		$('#bcInstallNoticeCloseButton').click(function() {
			bcScriptHandlerInstallNotice.hide();
		});
	},
	hide:function() {
		$('#bcScriptHandlerNoticeWrapper').animate({ height:'0' }, 300, function() { $('#bcScriptHandlerNoticeWrapper').hide(); });
	},
	setMessage:function(msg) {
		$('#bcInstallNoticeMessage').html(msg);
	}
}
bcshNotice = bcScriptHandlerInstallNotice;