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
(function() {
	$('body').ready(function() {
		var injected = false;
		if(!injected) {
			injected = true;
			//------------ Get & process injections -------------------------
			// parse userscripts.org script pages
			if (document.location.toString().match(/http:\/\/(www\.)?userscripts\.org\/scripts\/show\/\d+$/)) {
				var installing = false;
				var installWrapper = document.getElementById('install_script');
				if (installWrapper) {
					installWrapper.style.position = 'relative';
					installWrapper.style.textAlign = 'center';
					var scriptSrc = installWrapper.getElementsByTagName('a')[0].href;
					var newInstall = document.createElement('a');
					newInstall.style.marginBottom = '5px';
					newInstall.className = 'userjs';
					newInstall.title = 'Install script in Blank Canvas Script Handler';
					newInstall.innerHTML = '<img src="' + chrome.extension.getURL("images/favicon.png") + '" style="vertical-align:middle; position:relative; top:-2px; margin-right:2px;"/>';
					newInstall.innerHTML += 'Install';
					newInstall.href = 'javascript:void(0);';
					newInstall.name = scriptSrc;
					newInstall.style.paddingLeft = '.4em';
					newInstall.style.paddingRight = '.4em';
					newInstall.addEventListener('click', function() {
						if (!installing) {
							newInstall.innerHTML = '<img src="' + chrome.extension.getURL("images/loading_green.gif") + '" style="vertical-align:middle; position:relative; top:-2px; margin-right:2px;"/> Install';
							installing = true;
							chrome.extension.sendRequest({
								name: 'installScript',
								src: scriptSrc
							}, function() {
								newInstall.innerHTML = '<img src="' + chrome.extension.getURL("images/favicon.png") + '" style="vertical-align:middle; position:relative; top:-2px; margin-right:2px;"/> Install';
								installing = false;
							});
						}
					}, true);
					installWrapper.innerHTML = '<style type="text/css">#install_script a.userjs:hover { text-decoration:none !important; }</style>';
					installWrapper.appendChild(newInstall);
					var scriptFeatures = document.createElement('div');
					var sidebar = document.getElementById('script_sidebar');
					scriptFeatures.innerHTML = '<h6>Script Features</h6><p id="bcScriptFeaturesDetails"><img src="' + chrome.extension.getURL('images/loading.gif') + '" style="vertical-align:middle"/> loading ...</p>';
					sidebar.insertBefore(scriptFeatures, sidebar.firstChild);
					chrome.extension.sendRequest({
						name: 'getScriptFromUrl',
						src: scriptSrc + '?noincrement'
					}, function(script) {
						document.getElementById('bcScriptFeaturesDetails').innerHTML = script.siteIcons;
						document.getElementById('bcScriptFeaturesDetails').innerHTML += script.featureIcons;
					});
				}
								
			}
			// parse *.user.js links
			chrome.extension.sendRequest({name: 'getOption', option:'installAnywhere'}, function(result) {
				if((result == null || typeof(result) == 'undefined' || result) && !(result != null && typeof(result) != 'undefined' && !result)) {
					var installing = false;
					$("a[href$='.user.js']").click(function(event) {
						event.preventDefault();
						if(!installing) {
							installing = true;
							_link = this;
							$(_link).prepend('<img class="bcScriptHandlerLoading" src="' + chrome.extension.getURL("images/loading.gif") + '" style="vertical-align:middle;"/> ');
							chrome.extension.sendRequest({
								name: 'installScript',
								src: _link.href,
								website:document.location.toString()
							}, function() {
								$('img.bcScriptHandlerLoading', _link).remove();
								installing = false;
							});
						} else
							alert('Please wait for script to finish installing.');
					});
				}
			});
		}
		
		
		
	})
})();



var unsafeWindow = {
	get document() { return document; },
	get location() { return document.location; },
	set location(url) { document.location = url; }
};


$('body').ready(function() {
	//------------ Get & process injections -------------------------
	chrome.extension.sendRequest({name: 'getInjections', location:document.location.toString()}, function(injections) {
		// perform script injections
		for (var i = 0; i < injections.length; i++) {
			try {
				(function(){
					//------------ define GM_* functions -------------------------
					function GM_log(txt) { console.log(txt); }
					var bcUserScriptsStyles = null;
					function GM_addStyle(css) {
						if(!bcUserScriptsStyles) {
							bcUserScriptsStyles = document.createElement('style');
							bcUserScriptsStyles.type = 'text/css';
								document.getElementsByTagName('head')[0].appendChild(bcUserScriptsStyles);
						}
						bcUserScriptsStyles.innerHTML += css + "\n";
					}
					
					function GM_registerMenuCommand() {}
					
					function GM_openInTab(src) {
						chrome.extension.sendRequest({name: 'openInTab', src:src});
					}
					function GM_xmlhttpRequest(options) {
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
						var $ = getJqueryInstance();
						alert($);
						$.ajax(ajaxOptions);
					}
					(function() {
						eval(injections[i].source);
					})();
				})(); 
			} catch(e) {
				console.log('BC Script Handler encountered an error in "' + injections[i].scriptName + '": ' + "" + e);
			}
		}
	});
});



















