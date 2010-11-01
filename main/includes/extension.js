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
chrome.extension.__defineGetter__("version", function() {
	return this.manifest.version;
});
chrome.extension.__defineGetter__("name", function() {
	return this.manifest.name;
});
chrome.extension.__defineGetter__('manifest', function() {
	if(!this._manifest) {
		var xhtp = new XMLHttpRequest();
        xhtp.open("GET", chrome.extension.getURL('/manifest.json'), false);
        xhtp.send(null);
        this._manifest = JSON.parse(xhtp.responseText);
	}
	return this._manifest;
});
var extension = chrome.extension;