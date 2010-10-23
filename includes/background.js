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
 
var $ = getJqueryInstance();
// load installed scripts
var installedScripts = localStorage['installedScripts'];
installedScripts = typeof(installedScripts) != 'object' ? {} : installedScripts;

var activeScripts = {};

function updateBadgeCount() {
	chrome.tabs.getSelected(null, function(tab) {
		activeScripts[tab.id] = typeof(activeScripts[tab.id]) != 'undefined' ? activeScripts[tab.id] : [];
		var numActive = activeScripts[tab.id].length;
		chrome.browserAction.setBadgeText({
			text:numActive > 0 ? numActive.toString() : '',
		});
	});
}
function removeScriptFromActiveScripts(script) {
	try {
		
	for(var tabId in activeScripts) {
		activeScripts[tabId] = typeof(activeScripts[tabId]) != 'undefined' ? activeScripts[tabId] : [];
		var newActiveList = [];
		for(var i = 0; i < activeScripts[tabId].length; i++)
			if(activeScripts[tabId][i].id != script.id)
				newActiveList.push(activeScripts[tabId][i]);
		activeScripts[tabId] = newActiveList;
	}
	} catch(e) { alert(e); }
	updateBadgeCount();
}

chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) { updateBadgeCount(); });

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	chrome.tabs.sendRequest(tabId,{
		tabId:tab.id
	}, function() {})
});



chrome.browserAction.setBadgeBackgroundColor({color:[53, 95, 140, 150]});

var installingNoticeTabId = 0;
chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
	switch(request.name) {
		case 'getInjections':
			var injections = [];
			var tabId = sender.tab.id;
			var scripts = getScriptsSorted();
			var isFirstScript = true;
			var url = request.location;
			for(var i = 0; i < scripts.length; i++) {
				if(scripts[i].runsOn(url)) {
					var script = scripts[i];
					// push script on to list of scripts for page
					activeScripts[tabId] = typeof(activeScripts[tabId]) != 'undefined' ? activeScripts[tabId] : [];
					if(isFirstScript) {
						activeScripts[tabId] = [];
						isFirstScript = false;
					}
					activeScripts[tabId].push({
						name:script.name,
						enabled:script.enabled,
						website:script.website,
						id:script.id
					});
					if(scripts[i].enabled)
						injections.push({
							source:scripts[i].injection,
							scriptName:scripts[i].name
						});
				}
			}
			updateBadgeCount();
			sendResponse(injections);
			break;
		case 'getOption':
			sendResponse(getOption(request.option));
			break;
		case 'getActiveScripts':
			chrome.tabs.getSelected(null, function(tab) {
				var scripts = typeof(activeScripts[tab.id]) != 'undefined' ? activeScripts[tab.id] : [];
				sendResponse(scripts);
			});
			break;
		case 'toggleScriptEnabled':
			var script = getScriptById(request.scriptId);
			script.enabled = script.enabled ? false : true;
			script.saveRecord();
			break;
		case "installScript": 	// listen for install  requests
			var script = new Script();
			
			// inject installing notice
			installingNoticeTabId = sender.tab.id;
			var xhtp = new XMLHttpRequest();
	        xhtp.open("GET", chrome.extension.getURL('/includes/installing_notice.js'), false);
	        xhtp.send(null);
	        var installNoticeCode = xhtp.responseText;
			chrome.tabs.executeScript(sender.tab.id, {
				code:installNoticeCode
			}, function() {
				
			});
			
			script.installFromUrl(request.src, {
				website:typeof(request.website) == 'string' ? request.website : null
			}, sendResponse, sender.tab.id);
			break;
		case 'loadResource':
			var resource = request.resource;
			var image = new Image();
			image.src = resource.src;
			image.onload = function() { 
				var imgWidth = image.width;
				var imgHeight = image.height;
				var myCanvas = document.createElement("canvas");
	  			var myCanvasContext = myCanvas.getContext("2d");
				myCanvas.width = imgWidth;
				myCanvas.height = imgHeight;
				myCanvasContext.drawImage(image,0,0);
				resource.base64 = myCanvas.toDataURL();;
				sendResponse(resource);
			}
			break;
		case 'deleteScriptById':
			var script = getScriptById(request.scriptId);
			var c = confirm('Are you sure you want to delete the script "' + script.name + '"?')
			if (c) {
				removeScriptFromActiveScripts(script);
				script.remove();
			}
			sendResponse();
			break;
		case 'openInTab':
			chrome.tabs.create({url: request.src, selected: true});
			break;
		case 'ajax':
			var type = (!request.options.method) ? 'GET' : request.options.method;
			var ajaxOptions = {
				type:type,
				url:request.options.url,
				success:function(response) {
					var obj = {
						responseText:response,
						readyState:'complete'
					}
					sendResponse(obj);
				}
			};
			if(type == 'POST' && request.options.data)
				ajaxOptions.data = request.options.data;
			$.ajax(ajaxOptions);
			break;
		case 'getScriptFromUrl':
			var script = new Script();
			script.loadFromUrl(request.src, function(script) {
				sendResponse({siteIcons:script.siteIcons, featureIcons:script.featureIcons});
			});
			break;
		case 'scriptGetSiteIcons':
			sendResponse(scriptGetSiteIcons(request.script, request.useLinks));
			break;
		case 'scriptGetFeatureIcons':
			sendResponse(scriptGetFeatureIcons(request.script));
			break;
	}
});

function getRandHash(seed) {
	function getRandSmallHash() {
		return MD5((typeof(seed) != 'undefined' ? seed : Math.random().toString()) + Math.random().toString()).replace(/\d/g, ''); 
	}
	return getRandSmallHash() + getRandSmallHash();
}
var lastTabUrl = '';


