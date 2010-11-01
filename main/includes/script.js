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
function Script(_record){
	var _this = this;
	var _errors = false;
	var _installTabId = null;
	if(_record && _record.toString().match(/^\d+$/))
		_record = Database.getTable('scripts').getRecordById(_record);
	else 
		_record = _record ? _record : Database.getTable('scripts').getNewRecord();
	function _getField(fieldName){
		return _record.getField(fieldName);
	}
	function _setField(fieldName, value){
		_record.setField(fieldName, value);
	}
	function _addError(code){
		if (!_errors) 
			_errors = [];
		_errors.push(code);
	}
	function _loadMissingResources(callback) {
		var missingResources = _this.getMissingResouces();
		var numResourcesInstalled = 0;
		if(missingResources.length > 0) {
			for(var z = 0; z < missingResources.length; z++) {
				var resource = missingResources[z];
				_this.loadResource(resource, function(resource) {
					setInstallMessage(_installTabId, ' ... loading @resource ' + (numResourcesInstalled + 1) + ' of ' + missingResources.length);
					numResourcesInstalled++;
					localStorage.setItem('@resources_' + _this.id + '_' + resource.key, JSON.stringify(resource))
					if(numResourcesInstalled == missingResources.length) {
						if(typeof(callback) == 'function') callback();
					}
				})
			}
		} else
			if(typeof(callback) == 'function') callback();
	}	
	function _loadRequires(callback){
		var numRequiresLoaded = 0;
		var requireUrls = _this.requireUrls;
		for(var i = 0; i < requireUrls.length; i++) {
			var src = requireUrls[i];
			function loadRequireFromUrl(_url, _scriptId, callback) {
				$.ajax({
					url: src,
					dataType: 'html',
					success: function(source){
						// create requires record and save
						_this.setRequireSourceByUrl(_url, sanitizeSource(source));
						callback();
					}, 
					error:function(request, status, error) {
						alert("BC Script Handler Warning - Unable to load @require:\n\n " + _url);
						callback();
					}
				});					
			}
			loadRequireFromUrl(src, _this.id, function() {
				setInstallMessage(_installTabId, ' ... loading @require ' + (numRequiresLoaded + 1) + ' of ' + requireUrls.length);
				numRequiresLoaded++;
				if(numRequiresLoaded == requireUrls.length && typeof(callback) == 'function')
					callback();
			});
		}
		if(requireUrls.length == 0 && typeof(callback) == 'function')
			callback();
	}
	function _parseDomains(){
		var domains = [];
		var domainsFound = {};
		var includes = _this.includes;
		for (var i = 0; i < includes.length; i++) {
			var domain = '';
			var matches = includes[i].match(/(?:[A-Z0-9-]+\.)+[A-Z]{2,4}/i);
			if (matches && !matches[0].match(/(php|html|htm|aps|aspx)$/i) && !matches[0].match(/^www\.[^\.]+$/) && !matches[0].match(/^beta\.[^\.]+$/)) {
				domain = matches[0];
			} else {
				matches = includes[i].match(/([A-Z0-9-]+)\.\*\//i);
				domain = matches ? matches[1] + '.*' : includes[i];
			}
			domain = domain.replace(/^\s*http.?:\/\//, '');
			if(domain != '')
				domainsFound[domain] = true;
		}
		for (var domain in domainsFound) {
			domains.push(domain);
		}
		_setField('domains', domains);
	}
	function _parseFeatureIcons(){
		var html = '';
		var source = _this.source;
		var requires = _this.requires;
		if(requires instanceof Array &&requires.length > 0)
			for(var i = 0; i < requires.length; i++) {
				source += requires[i].getField('source', false);
			}
		// compatibility
		var matches = source.match(/(GM_getResourceText)/gi);
		if (matches) {
			var found = {};
			for (var i = 0; i < matches.length; i++) 
				found[matches[i]] = true;
			var offendingStrings = '';
			for (var match in found) 
				offendingStrings += ', ' + match;
			offendingStrings = offendingStrings.replace(/^,\s/, '');
			var single = !offendingStrings.match(/,/);
			html += '<img src="' + chrome.extension.getURL('images/error_red.png') + '" title="This script may not work as it uses ' + (single ? 'a feature' : 'features') + ' that ' + (single ? 'is' : 'are') + ' either not implemented yet or are not supported. The feature' + (single ? '' : 's') + ' detected ' + (single ? 'is' : 'are') + ': ' + offendingStrings + '" style="vertical-align:middle;"/> '
		}
		if(source.match(/unsafeWindow/i)) 
			html += '<img src="' + chrome.extension.getURL('images/application_delete.png') + '" title="This script may use the \'unsafeWindow\' object. This is often used to access JavaScript in the target page. Google Chrome prevents access to JavaScript in pages for security purposes, so some features of this script may not work." style="vertical-align:middle;"/> '
		if(source.match(/@require\s+/i)) 
			html += '<img src="' + chrome.extension.getURL('images/script_link.png') + '" title="This script includes other scripts through the @require directive. These external scripts are downloaded once on installation, and are then included from your hard drive from then on." style="vertical-align:middle;"/> '
		if(source.match(/@resource\s+/i)) 
			html += '<img src="' + chrome.extension.getURL('images/image_link.png') + '" title="This script uses the @resource directive to locally store resources such as images. These are acquired during script installation and are loaded from your hard drive from then on." style="vertical-align:middle;"/> '
		if(source.match(/(GM_setValue|GM_getValue|localStorage)/i)) 
			html += '<img src="' + chrome.extension.getURL('images/database_save.png') + '" title="This script stores information on your computer. Many scripts use this feature in order to remember settings or data relevant to the script\'s execution." style="vertical-align:middle;"/> '
		if(source.match(/(iframe|ajax|GM_xmlhttpRequest|\.submit\(\))/i)) 
			html += '<img src="' + chrome.extension.getURL('images/world_go.png') + '" title="This script may be performing cross-domain requests. While it is highly unlikely, there is a chance that malicious script authors may be sending information without your permission." style="vertical-align:middle;"/> '
		if(source.match(/cookie/i)) 
			html += '<img src="' + chrome.extension.getURL('images/cookie.png') + '" title="This script contains a reference to the word \'cookie\'. This is most likely an innocent use of cookies, but malicious script authors may be trying to steal your cookie information." style="vertical-align:middle;"/> '
		if(source.match(/(GM_addStyle|\.style\d|\.css\()/i)) 
			html += '<img src="' + chrome.extension.getURL('images/css.png') + '" title="This script modifies page styles through CSS." style="vertical-align:middle;"/> '
		_setField('featureIcons', html);
	}
	function _parseHeaders(){
		var source = _this.source;
		var headers = {};
		_errors = false;
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
			_setField('headers', headers);
			_setField('name', headers.name ? headers.name : '');
			_setField('description', headers.description ? headers.description : '');
			_setField('author', headers.author ? headers.author : '');
			_setField('version', headers.version ? headers.version : '');
			_setField('namespace', headers.namespace ? headers.namespace : '');
			if(headers.website && headers.website.toString().match(/^https?:\/\//))
				_this.website = headers.website.toString();
			_parseIncludes();
			_parseExcludes();
			_parseRequires();
			_parseResources();
			_parseDomains();
			_parseSiteIcons();
			_parseFeatureIcons();
		}
		else {
			_addError('headers');
		}
	}
	function _parseExcludes(){
		var excludes = [];
		var headers = _this.headers;
		if (headers.exclude instanceof Array) 
			for (var i = 0; i < headers.exclude.length; i++) 
				excludes.push(headers.exclude[i]);
		else 
			excludes.push(headers.exclude);
		_setField('excludes', excludes);
	}
	function _parseIncludes(){
		var includes = [];
		var headers = _this.headers;
		if (headers.include instanceof Array) 
			for (var i = 0; i < headers.include.length; i++) 
				includes.push(headers.include[i]);
		else 
			includes.push(headers.include);
		_setField('includes', includes);
	}
	function _parseResources(){
		var resources = [];
		var headers = _this.headers;
		if (headers.resource instanceof Array) 
			for (var i = 0; i < headers.resource.length; i++) 
				resources.push(headers.resource[i]);
		else 
			if (headers.resource) 
				resources.push(headers.resource);
		var resourceObjects = [];
		for(var i = 0; i < resources.length; i++)
			try {
				var  matches = resources[i].match(/^\s*([^\s]+)\s(http[^\s]+)$/) 
				resourceObjects.push({
					key:matches[1],
					url:matches[2]
				});
			} catch(e) { }
		_setField('resources', resourceObjects);
	}
	function _parseRequires(){
		var requires = [];
		var headers = _this.headers;
		if (headers.require instanceof Array) 
			for (var i = 0; i < headers.require.length; i++) 
				requires.push(headers.require[i]);
		else 
			if (headers.require) 
				requires.push(headers.require);
		_setField('requireUrls', requires);
	}
	function _parseSiteIcons(){
		var html = '';
		var domains = _this.domains
		for (var i = 0; i < domains.length; i++) {
			var domain = domains[i];
			var faviconDomain = domain.replace(/\.\*$/, '.com').replace(/^\*\./, '');
			html += '<a href="http://' + faviconDomain + '" target="_blank">';
			html += '<img src="http://s2.googleusercontent.com/s2/favicons?domain=' + faviconDomain + '" title="Script runs on ' + domain + '" style="vertical-align:middle"/>';
			html += '</a> ';
		}
		_setField('siteIcons', html)
	}
	this.install = function(callback) {
		var c = confirm('Install "' + this.name + '"' + "?\n\nNote: Only install scripts from sources you trust.");
		if (c) {
			chrome.tabs.executeScript(_installTabId, {
				code:'bcScriptHandlerInstallNotice.show(\'' + this.name.replace(/'/, "\\'") + '\');'
			});
			_this.save(function(){
				//updateAndFocusOptions();
				setInstallMessage(_installTabId, ' ... installation complete');
				chrome.tabs.executeScript(_installTabId, {
					code:'bcScriptHandlerInstallNotice.showCloseButton();'
				});
				callback();
			});
		} else if(typeof(callback) == 'function') 
			callback();
	}
	this.removeRequireByUrl = function(url) {
		localStorage.removeItem('@require_' + this.id + '_' + url);
	}
	this.getRequireSourceByUrl = function(url) {
		var requireSource = localStorage.getItem('@require_' + this.id + '_' + url);
		if(!requireSource)
			requireSource = localStorage.getItem('@require ' + url);	// old require storage method
		return requireSource ? requireSource : null;
	}
	this.setRequireSourceByUrl = function(url, source) {
		localStorage.removeItem('@require_' + this.id + '_' + url);
		localStorage.setItem('@require_' + this.id + '_' + url, source);
	}
	this.getResourceByKey = function(key) {
		var val = localStorage.getItem('@resources_' + _this.id + '_' + key);
		return val ? JSON.parse(val) : null;
	}
	this.installFromUrl = function(url, options, callback, tabId){
		_installTabId = tabId;
		
		if(typeof(options.website) == 'string') this.website = options.website;
		this.loadFromUrl(url, function(){
			_this.install(callback);
		});
	}
	this.loadFromUrl = function(src, callback){
		this.src = src;
		$.ajax({
			url: src,
			dataType: 'html',
			success: function(source){
				_this.source = source;
				if(typeof(callback) == 'function') 
					callback(_this);
			}
		});
	}
	this.loadResource = function (resource, callback) {
		// verify header and status
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("HEAD", resource.url, true);
		xmlhttp.onreadystatechange=function() {
			if (xmlhttp.readyState == 4) {
				resource.status = xmlhttp.status;
				if (resource.status.toString() == '200') {
					resource.headers = xmlhttp.getAllResponseHeaders();
					if(resource.headers.match(/Content-Type:\s+image\//i)) {
						var image = new Image();
						image.src = resource.url;
						image.onload = function() {
							var imgWidth = image.width;
							var imgHeight = image.height;
							var myCanvas = document.createElement("canvas");
				  			var myCanvasContext = myCanvas.getContext("2d");
							myCanvas.width = imgWidth;
							myCanvas.height = imgHeight;
							myCanvasContext.drawImage(image,0,0);
							resource.data = myCanvas.toDataURL();;
							resource.loaded = true;
							callback(resource);
						}
					} else callback(resource);
				} else {
					alert("Warning, @resource " + resource.key + " " + resource.url + " returned 404 - not found");
					callback(resource);
				}
			}
		}
		xmlhttp.send(null);
		resource.responseCode = true;
	}
	this.moveDown = function() {
		var scripts = getScriptsSorted();
		for(var i = getHighestScriptOrder() - 1; i >= 0; i--) {
			if(scripts[i].id == this.id) {
				this.order = i + 2;
				this.save();
				scripts[i + 1].order = i + 1;
				scripts[i + 1].saveRecord();
			} else {
				scripts[i].order = i + 1;
				scripts[i].saveRecord();
			}
		}
		redrawScriptList();
	}
	this.moveUp = function() {
		var scripts = getScriptsSorted();
		for(var i = 0; i < scripts.length; i++) {
			if(scripts[i].id == this.id) {
				this.order = i;
				this.save();
				scripts[i - 1].order = i + 1;
				scripts[i - 1].saveRecord();
			} else {
				scripts[i].order = i + 1;
				scripts[i].saveRecord();
			}
		}
		redrawScriptList();
	}
	this.remove = function(){
		this.removeResources();
		_record.remove();
	}
	this.removeRequires = function(){
		for (var x in localStorage) {
			var pattern = new RegExp('^@require_' + _this.id + '_');
			if (x.match(pattern)) 
				localStorage.removeItem(x);
		}
	}
	this.removeResources = function(){
		for (var x in localStorage) {
			var pattern = new RegExp('^@resources_' + _this.id + '_');
			if (x.match(pattern)) 
				localStorage.removeItem(x);
		}
	}
	this.runsOn = function(location) {
		function escapeLocation(loc) {
			return loc.replace(/\./g, '\\.').replace(/\?/g, '\\?').replace(/\//g, '\\/').replace(/\*/g, '.*?')
		}
		var runs = false;
		var includes = this.includes;
		for(var i = 0; i < includes.length; i++) {
			var patternStr = escapeLocation(includes[i]);
			var pattern = new RegExp(patternStr);
			if (pattern.test(location)) {
				runs = true;
				continue;
			}
		}
		
		try {
			
		var excludes = this.excludes;
		for(var i = 0; i < excludes.length; i++) {
			if(excludes[i]) {		// make sure it's not null for some reason
				var patternStr = escapeLocation(excludes[i]);
				var pattern = new RegExp(patternStr);
				if (pattern.test(location)) {
					runs = false;
					continue;
				}
			}
		}

		} catch(e) { alert(e); }
		return runs;
	}
	this.saveRecord = function(){
		_record.save();
	}
	this.save = function(callback){
		function completeSave() {
			_this.enabled = true;
			_this.complete = true;
			_parseFeatureIcons();
			_this.saveRecord();
			// remove unused @requires
			if(!_this.headers.require) _this.removeRequires();
			for(var x in localStorage) {
				var pattern = new RegExp('^@require_' + _this.id + '_(.+)$');
				var matches = x.match(pattern); 
				if(matches) {// && _this.getRequireSourceByUrl(matches[1]) == null) {
					var isUsed = false;
					var usedRequireUrls = _this.requireUrls;
					for(var x = 0; x < usedRequireUrls.length; x++) {
						if(usedRequireUrls[x] == matches[1]) isUsed = true;
					}
					if(!isUsed)
						_this.removeRequireByUrl(matches[1]);
				}
			}
			// remove duplicates (previously installed)
			var scripts = getScripts();
			for(var i = 0; i < scripts.length; i++) {
				if(scripts[i].id != _this.id && scripts[i].hash == _this.hash)
				scripts[i].remove();
			}
			callback();
		}
		if(!this.errors) {
			if (!_record.id) {
				var highestOrder = getHighestScriptOrder();
				this.order = highestOrder + 1;
			}
			_this.enabled = true;
			_this.complete = true;
			_record.save();
			// remove duplicates (previously installed)
			var scripts = getScripts();
			for(var i = 0; i < scripts.length; i++) {
				if(scripts[i].id != _this.id && scripts[i].hash == _this.hash)
					scripts[i].remove();
			}
			
			if(!this.hasAllRequires()) 
				_loadRequires(function() {
					_loadMissingResources(completeSave);
				});
			else 
				if (typeof(callback) == 'function') 
					_loadMissingResources(completeSave);
		}
		else {
			alert('Unable to save script due to header errors');
			if (typeof(callback) == 'function') 
				callback();
		}
	}
	this.hasAllRequires = function() {
		var requireUrls = this.requireUrls;
		var hasAll = true;
		for(var i in requireUrls) {
			hasAll = localStorage.getItem('@require_' + this.id + '_' + requireUrls[i]) ? hasAll : false;
		}
		return hasAll;
	}
	this.getMissingResouces = function() {
		try {
			
		// load references to stored resources
		var savedResources = {};
		for(var x in localStorage) {
			var pattern = new RegExp('^@resources_' + _this.id + '_');
			if(x.match(pattern))
				savedResources[x.replace(pattern, '')] = true;
		}
		// make sure all resource objects are stored
		var resources = this.resources;
		
		var missing = [];
		for(var i in resources) {
			if(typeof(savedResources[resources[i].key]) == 'undefined') missing.push(resources[i]);
		}
		return missing;
		
		
		} catch(e) { alert(e); }
	}
	this.id;
	this.__defineGetter__("id", function(){
		var val = _record.id;
		return val ? val : 0;
	});
	this.author;
	this.__defineGetter__("author", function(){
		var val = _getField('author');
		return val ? val : '';
	});
	this.complete;
	this.__defineGetter__("complete", function(){
		return _getField('complete') == 'complete';
	});
	this.__defineSetter__("complete", function(value){
		_setField('complete', value ? 'complete' : 'no');
	});
	this.displayName;
	this.__defineGetter__("displayName", function(){
		var displayName = _getField('displayName');
		return displayName ? displayName : this.name;
	});
	this.__defineSetter__("displayName", function(value){
		_setField('displayName', value);
	});
	this.description;
	this.__defineGetter__("description", function(){
		var val = _getField('description');
		return val ? val.toString() : '';
	});
	this.domains;
	this.__defineGetter__("domains", function(){
		var val = _getField('domains');
		return val ? val : [];
	});
	this.errors;
	this.__defineGetter__("errors", function(){
		return _errors;
	});
	this.enabled;
	this.__defineGetter__("enabled", function(){
		return _getField('enabled');
	});
	this.excludes;
	this.__defineGetter__("excludes", function(){
		var val = _getField('excludes');
		return val ? val : [];
	});
	this.__defineSetter__("enabled", function(value){
		_setField('enabled', value ? true : false);
		_record.save();
	});
	this.featureIcons;
	this.__defineGetter__("featureIcons", function(){
		var val = _getField('featureIcons');
		return val ? val : '';
	});
	this.hash;
	this.__defineGetter__("hash", function(){
		if(_this.userscriptsId) {
			return MD5(_this.userscriptsId);
		} else
			return MD5(_this.name + _this.namespace);
	});
	this.headers;
	this.__defineGetter__("headers", function(){
		return _getField('headers');
	});
	this.id;
	this.__defineGetter__("id", function(){
		return _record.id;
	});
	this.includes;
	this.__defineGetter__("includes", function(){
		var val = _getField('includes');
		return val ? val : [];
	});
	this.injection;
	this.__defineGetter__("injection", function() {
		var hash = getRandHash(this.name);
		var injectCode = "\n\n ";

		// include @resource directives
		injectCode += "var " + this.hash.replace(/\d/g, '') + "resources = {};\n";
		
		var resources = this.resources;
		for(var i = 0; i < resources.length; i++) {
			if(resources[i].data) {
				injectCode += this.hash.replace(/\d/g, '') + 'resources["' + resources[i].key.replace(/"/g, '\\"') + '"] = "' + resources[i].data.replace(/"/g, '\\"').replace(/\n|\r/g, "\\\\\n") + "\";\n";
			}
		}
			
		injectCode += " \n\n function GM_getValue(key, def) {\
				key = '" + this.hash + "'.replace(/\\d/g, '') + key;\
				if(typeof(localStorage[key]) == 'undefined' && typeof(def) != 'undefined') return def;\
			  		return localStorage[key];\
			  }\
		      function GM_setValue(key, val) {\
			  	key = '" + this.hash + "'.replace(/\\d/g, '') + key;\
			  	localStorage.setItem(key, val);\
			  }\
		      function GM_getResourceURL(key) {\
			  	if(typeof(" + this.hash.replace(/\d/g, '') + "resources[key]) != 'undefined') {\
					return " + this.hash.replace(/\d/g, '') + "resources[key];\
				} else {\
					GM_log('BC Script Handler error found in script \"" + this.name + "\": Unable to load resource for key \"' + key + '\"');\
					return '';\
				}\
			  }\
			  function GM_xmlhttpRequest(options) {\
				chrome.extension.sendRequest({name: 'ajax', options:options}, options.onload);\
			  }\
			  function GM_listValues() {\
				var pattern = new RegExp('^" + this.hash.replace(/\d/g, '').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1") + "');\
				var values = [];\
			  	for(var name in localStorage)\
					if(pattern.test(name))\
						values.push(name.replace(pattern, ''));\
				return values;\
			  }\
			  function GM_deleteValue (key, def) {\
				key = '" + this.hash + "'.replace(/\\d/g, '') + key;\
				localStorage.removeItem(key);\
			  }\n\n"; 
		var requireUrls = this.requireUrls;
		for(var z = 0; z < requireUrls.length; z++) {
			injectCode += "\n\n\r\r try { \n\r" + this.getRequireSourceByUrl(requireUrls[z]) + 
							  "\r\n\r\n } catch(e) { console.log('Error in user script \"" +
								this.name.replace(/'/g, "\\'") +
								"\" (@require #" + (z + 1) + "): ' + e); } \r\r" +
							  "\n\r\n\r" ;
		}
		injectCode += "\n\r\n\r" + this.source +
			//(namespace ? '} ' + "\n\n" + 'namespaces["' + namespace + '"]();' + "\n" : '') +
			" \r\r\n\n  \r\n\r\n ";
			
		return convertCdataStrings(injectCode);
	});
	this.namespace;
	this.__defineGetter__("namespace", function(){
		var val = _getField('namespace');
		return val ? val : '';
	});
	/*
	this.requires;
	this.__defineGetter__("requires", function(){
		if (_this.id) {
			var requires = Database.getTable('requires').getRecords('where scriptId = ' + _this.id, false);
			return (requires && requires.toString() != 'undefined') ? requires : [];
		} else return [];
	});
	*/
	this.requireUrls;
	this.__defineGetter__("requireUrls", function(){
		var val = _getField('requireUrls');
		return val ? val : [];
	});
	this.src;
	this.__defineGetter__("src", function(){
		var val = _getField('src');
		return val ? val : '';
	});
	this.__defineSetter__("src", function(src){
		var userscriptsId = src.match(/userscripts\.org[^\d]+\/(\d+)\.user\.js$/);
		userscriptsId = userscriptsId ? userscriptsId[1] : userscriptsId;
		_setField('userscriptsId', userscriptsId);
		if (userscriptsId) 
			this.website = 'http://userscripts.org/scripts/show/' + userscriptsId;
		_setField('src', src);
	});
	this.siteIcons;
	this.__defineGetter__("siteIcons", function(){
		var val = _getField('siteIcons');
		return val ? val : '';
	});
	this.name;
	this.__defineGetter__("name", function(){
		var val = _getField('name');
		return val ? val : '';
	});
	this.order;
	this.__defineGetter__("order", function(){
		var val = _getField('order');
		return (val && val.toString().match(/^\d+$/)) ? val : 1;
	});
	this.__defineSetter__("order", function(val){
		_setField('order', val);
	});
	this.resources;
	this.__defineGetter__("resources", function(){
		var val = _getField('resources');
		var saved = val ? val : [];
		var resources = [];
		for(var i = 0; i < saved.length; i++) {
			var fullObj = this.getResourceByKey(saved[i].key);
			resources.push(fullObj ? fullObj : saved[i]);
		}
		return resources;
	});
	this.version;
	this.__defineGetter__("version", function(){
		var val = _getField('version');
		return val ? val : '';
	});
	this.source;
	this.__defineGetter__("source", function(){
		return _getField('source');
	});
	this.__defineSetter__("source", function(value){
		_setField('source', sanitizeSource(value));
		_parseHeaders();
	});
	this.userscriptsId;
	this.__defineGetter__("userscriptsId", function(){
		var val = _getField('userscriptsId');
		return (val && val.toString().match(/^\d+$/)) ? val : false;
	});
	this.website;
	this.__defineGetter__("website", function(){
		var val = _getField('website');
		return val ? val : '';
	});
	this.__defineSetter__("website", function(val){
		_setField('website', val);
	});
}