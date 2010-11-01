/* Blank Canvas Script Handler [http://blankcanvas.me/scripthandler/]
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
try {

	Database.defineTables([{
			name: 'scripts',
			fields: ['source', 'displayName', 'name', 'namespace', 'excludes', 'description', 'author', 'version', 'src', 'headers', 'includes', 'requireUrls', 'domains', 'siteIcons', 'userscriptsId', 'headers', 'siteIcons', 'featureIcons', 'website', 'enabled', 'complete', 'order', 'resources']
		}, {
			name: 'resources',
			fields: ['key', 'url', 'data', 'status', 'loaded', 'headers']
		}
	]);
	function editScript(scriptId) {
		localStorage.setItem('startScriptEdit', scriptId);
		openOptionsTab();
	}
	function convertCdataStrings(source) { 
		var matches = source.match(/<><!\[CDATA\[((.|\n|\r)+?)\]\]><\/>(\.to(XML)?String\(\))?/g)
		if(matches) {
			for(var i = 0; i < matches.length; i++) {
				var code = matches[i];
				code = code.replace(/^<><!\[CDATA\[/, '').replace(/\]\]><\/>(\.to(XML)?String\(\))?$/, '');
				code = code.replace(/"/g, '\\"'); // escape quotes
				code = code.replace(/\n|\r/g, '\\' + "\n"); // escape end lines
				
				source = source.replace(/<><!\[CDATA\[((.|\n|\r)+?)\]\]><\/>(\.to(XML)?String\(\))?/, '"' + code + '"');
			}
		}
		return source;
	}	
	function getActiveScripts(sendResponse) {
		chrome.tabs.getSelected(null, function(tab) {
			var scripts = typeof(activeScripts[tab.id]) != 'undefined' ? activeScripts[tab.id] : [];
			sendResponse(scripts);
		});
	}
	function getNumActiveScripts(callback) {
		chrome.tabs.getSelected(null, function(tab) {
			activeScripts[tab.id] = typeof(activeScripts[tab.id]) != 'undefined' ? activeScripts[tab.id] : [];
			var numActive = activeScripts[tab.id].length;
			callback(numActive);
		});
	}
	function toggleScriptEnabled(id) {
		var script = getScriptById(id);
		script.enabled = script.enabled ? false : true;
		script.saveRecord();
	}
	function sanitizeSource(source) {
		source = source.replace(/uneval\((.*?)\)/, "'(' + JSON.stringify($1) + ')'")
		source = source.replace(/\.new/g, '.new_');		// chrome can't handle the "new" keyword as a property
		return source;
	}
	function getHighestScriptOrder() {
		var order = 0;
		var scripts = getScripts();
		for(var i = 0; i < scripts.length; i++) {
			var script = scripts[i];
			order = script.order > order ? script.order : order;
		}
		return order;
	}
	function getScriptByOrder(target) {
		var scripts = getScripts();
		for(var i = 0; i < scripts.length; i++) {
			var script = scripts[i];
			if(script.order == target)
				return script;
		}
		return false;
	}
	function getScriptsSorted() {
		var array = {};
		var scripts = getScripts();
		for(var i = 0; i < scripts.length; i++) {
			var order = parseInt(scripts[i].order);
			while(typeof(array[order]) != 'undefined')
				order++;
			array[order] = scripts[i]; 
		}
		var keys = new Array();
		for(k in array) {
		     keys.push(k);
		}
		keys.sort(function(a, b) { a = parseInt(a); b = parseInt(b); return (a > b) - (a < b); });
		var sortedScripts = [];
		for(var i = 0; i < keys.length; i++) {
		    sortedScripts.push(array[keys[i]]);
		}
		return sortedScripts;
	}


	function getHeaders(source){
		var headers = {};
		var tmp = source.match(/\/\/ ==UserScript==((.|\n|\r)*?)\/\/ ==\/UserScript==/);
		if (tmp) {
			var lines = tmp[0].match(/@(.*?)(\n|\r)/g);
			for (var i = 0; i < lines.length; i++) {
				var tmp = lines[i].match(/^@([^\s]*?)\s+(.*)/);
				var key = tmp[1];
				var value = tmp[2];
				if (headers[key] && !(headers[key] instanceof Array)) 
					headers[key] = new Array(headers[key]);
				if (headers[key] instanceof Array) 
					headers[key].push(value);
				else 
					headers[key] = value;
			}
			return headers;
		}
		else 
			return null;
	}
	function getLastScriptId(){
		var lastId = 0;
		for (var key in localStorage) {
			var idMatch = key.match(/script_(\d+)$/);
			var id = idMatch ? parseInt(idMatch[1]) : 0;
			lastId = id > lastId ? id : lastId;
		}
		return lastId;
	}
	function getNextAutoIndex(field){
		if (!localStorage['autoIndex_' + field]) 
			localStorage['autoIndex_' + field] = 0;
		
	}
	function getNextScriptId(){
		return getLastScriptId() + 1;
	}

	function getScriptFromSource(source, src){
		var headers = getHeaders(source);
		if (!headers) {
			alert("Invalid user script. // ==UserScript== headers block not found");
			var script = null;
		}
		else {
			if (!headers['name']) {
				alert("Script Error: Script name not found in headers block.")
				var script = null;
			}
			else {
				var userscriptsId = src ? src.match(/userscripts\.org[^\d]+\/(\d+)\.user\.js$/) : '';
				userscriptsId = userscriptsId ? userscriptsId[1] : userscriptsId;
				var script = {
					id: null,
					src: src ? src : '',
					userscriptsId: userscriptsId,
					source: source,
					headers: headers,
					enabled: true,
					requires: [],
				}
			}
		}
		return script;
	}
	function getScripts(){
		var records = Database.getTable('scripts').getRecords();
		var scripts = [];
		for (var i = 0; i < records.length; i++) 
			scripts.push(new Script(records[i]));
		return scripts;
	}
	function scriptGetIncludes(script){
		var includes = [];
		if (script.headers['include'] instanceof Array) 
			for (var i = 0; i < script.headers['include'].length; i++) 
				includes.push(script.headers['include'][i]);
		else 
			includes.push(script.headers['include']);
		return includes;
	}
	function scriptGetDomains(script){
		var domains = [];
		var domainsFound = {};
		var includes = scriptGetIncludes(script);
		for (var i = 0; i < includes.length; i++) {
			var domain = '';
			var matches = includes[i].match(/(?:[A-Z0-9-]+\.)+[A-Z]{2,4}/i);
			if (matches && !matches[0].match(/(php|html|htm|aps|aspx)$/i) && !matches[0].match(/^www\.[^\.]+$/) && !matches[0].match(/^beta\.[^\.]+$/)) {
				domain = matches[0];
			}
			else {
				matches = includes[i].match(/([A-Z0-9-]+)\.\*\//i);
				domain = matches ? matches[1] + '.*' : includes[i];
			}
			domainsFound[domain] = true;
		}
		for (var domain in domainsFound) {
			domains.push(domain);
		}
		return domains;
	}

	function scriptLoadRequires(script, callback){
		if (script.headers['require']) {
			requires = script.headers['require'] instanceof Array ? script.headers['require'] : [script.headers['require']];
			var numLoaded = 0;
			for (var i = 0; i < requires.length; i++) {
				var requireUrl = requires[i];
				$.ajax({
					url: requireUrl,
					success: function(response){
						numLoaded++;
						if (numLoaded == requires.length) 
							callback(script);
					}
				})
			}
		}
	}
	function scriptGetSiteIcons(script, useLinks){
		var html = '';
		useLinks = typeof(useLinks) == 'undefined' ? true : useLinks;
		var domains = scriptGetDomains(script);
		for (var i = 0; i < domains.length; i++) {
			var domain = domains[i];
			var faviconDomain = domain.replace(/\.\*$/, '.com');
			html += useLinks ? '<a href="http://' + faviconDomain + '" target="_blank">' : '';
			html += '<img src="http://s2.googleusercontent.com/s2/favicons?domain=' + faviconDomain + '" title="Script runs on ' + domain + '" style="vertical-align:middle"/>';
			html += useLinks ? '</a> ' : ' ';
		}
		return html;
	}
	function getExistingScript(script){
		var existingScript = false;
		var scripts = getScripts();
		for (var i = 0; i < scripts.length; i++) {
			if (script.headers['name'] == scripts[i].headers['name'] &&
			script.headers['author'] == scripts[i].headers['author'] &&
			script.headers['namespace'] == scripts[i].headers['namespace']) 
				existingScript = scripts[i];
		}
		return existingScript;
	}
	
	function getOptionsTab(callback){
		var optionsTab = false;
		chrome.tabs.getAllInWindow(null, function(tabs){
			for (var i = 0; i < tabs.length; i++) {
				if (tabs[i].url == chrome.extension.getURL("options.html")) 
					optionsTab = tabs[i];
			}
			if (typeof(callback) == 'function') 
				callback(optionsTab);
		});
	}
	function openOptionsTab(queryStr){
		getOptionsTab(function(existingOptionsTab) {
			if (existingOptionsTab) {
				chrome.tabs.remove(existingOptionsTab.id);
			}
			chrome.tabs.create({
				url: "options.html"
			});
		});
	};
	function updateAndFocusOptions(){
		getOptionsTab(function(tab){
			if (tab) 
				chrome.tabs.remove(tab.id);
			openOptionsTab();
		});
	}
	function setOption(key, val) {
		localStorage.setItem('options_' + key, JSON.stringify(val));
	}
	function getOption(key, deflt) {
		var val = localStorage.getItem('options_' + key);
		if(val == null && typeof(deflt) != 'undefined') return deflt; 
		return val ? JSON.parse(val) : val; 
	}
	function getScriptById(id){
		return new Script(Database.getTable('scripts').getRecordById(id));
	}
	function setInstallMessage(tabId, msg) {
		chrome.tabs.executeScript(tabId, {
			code:'bcScriptHandlerInstallNotice.setMessage(\'' + msg.replace(/'/, "\\'") + '\');'
		});
	}
	function showInstallNotice(tabId) {
		chrome.tabs.executeScript(tabId, {
			code:'bcScriptHandlerInstallNotice.show();'
		});
	}
} catch(e) { alert("Script Handler Error: " + e); }


