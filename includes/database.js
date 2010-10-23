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
 
var Database;
var com = typeof(com) != 'undefined' ? com : {};
com.blankcanvasweb = typeof(com.blankcanvasweb) != 'undefined' ? com.blankcanvasweb : {};
com.blankcanvasweb.Database = function() {
	function DatabaseInstance() {
		var _tableOptions = {};
		var _storageMethod = 'localStorage';
		this.defineTable = function(options) {
			if(typeof(options) != 'object')
				alert("Database Error:\n\nDatabase.defineTable() expects an object");
			else if(typeof(options.name) != 'string') 
				alert("Database Error - Database.defineTable(options):\n\noptions.name must be a string ");
			else if(!options.name.match(/^[a-z]+$/i))
				alert("Database Error - Database.defineTable(options):\n\nTable name \"" + options.name + "\" is invalid. Table names may only contain letters.");
			else if(typeof(options.fields) != 'object' || typeof(options.fields.length) == 'undefined') 
				alert("Database Error - Database.defineTable(options):\n\noptions.fields must be an array of field objects");
			else if(options.fields.length == 0) 
				alert("Database Error - Database.defineTable(options):\n\noptions.fields must contain at least one field object");
			else
				for(var i = 0; i < options.fields.length; i++)
					if(typeof(options.fields[i]) != 'string') 
						alert("Database Error - Database.defineTable(options):\n\nField names must be strings " + typeof(options.fields[i]));
					else if(!options.fields[i].match(/^[a-z]+$/i))
						alert("Database Error - Database.defineTable(options):\n\nInvalid field name \"" + options.fields[i].name + "\". Field names may only contain letters");
			_tableOptions[options.name] = options;
		}
		this.defineTables = function(tables) {
			for(var i = 0; i < tables.length; i++)
				this.defineTable(tables[i]);
		}
		this.getTable = function(tableName) {
			if(typeof(_tableOptions[tableName]) != 'object') alert("Database Error:\n\nTable \"" + tableName + "\" has not been defined.");
			return new DatabaseTable(tableName, _tableOptions[tableName]);
		}
		this.setStorageMethod = function(type) {
			if(type.match(/^(localStorage)$/i))
				_storageMethod = 'localStorage';
			else if(type.match(/^(Greasemonkey)$/i)) 
				alert("Database Error:\n\nThe Greasemonkey storage method is not yet supported.");
			else if(type.match(/^(cookies)$/i))
				alert("Database Error:\n\nThe cookies storage method is not yet supported.");
			else 
				alert("Database Error:\n\nThe storage type\"" + type + "\n is not supported. Please see documentation.")
		}
	}
	var DatabaseTable = function(_name, _options) {
		//alert(_name);
		var _sortField = 'sort';		// sort by the order field by defaut
		function _getNextPrimaryKey() {
			var storedPrimaryKey = localStorage.getItem('dbPrimaryKeysAutoIncrement_' + _name);
			var nextKey = storedPrimaryKey ? parseInt(storedPrimaryKey) + 1 : 1;
			localStorage.setItem('dbPrimaryKeysAutoIncrement_' + _name, nextKey);
			return nextKey;
		}
		function _getRecordIndexStorageKey(recordId) {
			return 'dbTableIndex_' + _name + '_' + recordId;
		}
		function _getStorageKey(fieldName, id) {
			return 'dbTable_' + _name + '_' + fieldName + '_' + id;
		}
		// public methods
		this.empty = function() {
			var records = this.getRecords();
			for(var i = 0; i < records.length; i++)
				records[i].remove();
		}
		this.getNewRecord = function(sql) {
			return new TableRecord(this);
		}
		this.getRecordById = function(id) {
			if(localStorage.getItem(_getRecordIndexStorageKey(id)))
				return new TableRecord(this, id);
			else
				return false;
		}
		this.getRecords = function(sql) {
			var records = [];
			// check for filter sql
			var filter = false;
			if (typeof(sql) == 'string') {
				var filterMatches = sql.match(/^\s*(where)\s+([a-z]+)\s+(=)\s+([0-9]+|(('|")([0-9a-z\s_-]+)('|")))/i);
				if (filterMatches) {
					filter = {
						field: filterMatches[2],
						condition: filterMatches[3],
						value: filterMatches[4].match(/^\d+$/) ? filterMatches[4] : filterMatches[7].toLowerCase(),
						isString: !filterMatches[4].match(/^\d+$/)
					}
				}
			}
			var pattern = new RegExp('^dbTableIndex_' + this.name + '_\\d+$');
			for(var storageKey in localStorage) {
				if(pattern.test(storageKey)) {
					var id = storageKey.match(/\d+$/)[0];
					var record = this.getRecordById(id);
					// check for results filter
					var filterPassed = true;
					if(filter) {
						var recordValue = record.getField(filter.field)
						if((filter.isString ? recordValue.toLowerCase() : recordValue) != filter.value)
							filterPassed = false;
					}
					if(filterPassed)
						records.push(record);
				}
			}
			return records;
		}
		this.hasField = function(fieldName) {
			for(var i = 0; i < this.fields.length; i++) 
				if(this.fields[i] == fieldName)
					return true;
			return false;
		}
		this.removeRecord = function(record){
			// remove all fields in record
			for(var i = 0; i < this.fields.length; i++) {
				record.emptyField(this.fields[i]);
			}
			// remove record from database table index
			localStorage.removeItem(_getRecordIndexStorageKey(record.id));
		}
		this.saveRecord = function(record, encode) {
			if(!record.id) { // create a new record if the record has no existing id
				// DatabaseTable instance - string flag to authorize record id assignment
				record.id = _getNextPrimaryKey();
				localStorage.setItem(_getRecordIndexStorageKey(record.id), true);
			}
			record.id = record.id;
			for(var fieldName in record.updatedFields) {
				var storageKey = _getStorageKey(fieldName, record.id);
				if(typeof(encode) == 'undefined' || encode)
					localStorage.setItem(storageKey, JSON.stringify(record.updatedFields[fieldName]));
				else
					localStorage.setItem(storageKey, record.updatedFields[fieldName]);
			}
		}
		// getters
		this.name; this.__defineGetter__("name", function() { return _name; });
		this.getHtml = function(includes) {
			var fields = this.fields;
			var html = '<table><tr><th>id</th>'; 
			for(var i = 0; i < fields.length; i ++) {
				html += '<th>' + fields[i] + '</th>';
			}
			html += '</tr>';
			var records = this.getRecords();
			for(var x = 0; x < records.length; x++) {
				html += '<tr><td>' + records[x].id + '</td>';
				for(var i = 0; i < fields.length; i ++) {
					html += '<td><div style="max-width:100px; height:100px; overflow:hidden;">' + (records[x].getField(fields[i]) ? records[x].getField(fields[i]).toString().replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<em>null</em>') + '</div></td>';
				}
				html += '</td>';
			}
			
			html += '</table>';
			return html;
		};
		this.fields; this.__defineGetter__("fields", function() { 
			return _options.fields; 
		});
	}
	var TableRecord = function(_table, _id){
		var _updatedFields = {};
		function _getStoreageKey(fieldName) {
			return 'dbTable_' + _table.name + '_' + fieldName + '_' + _id
		}
		function _fieldCheck(fieldName) {
			if(!_table.hasField(fieldName)) alert('Database Error:' + "\n\n" + ' Field "' + fieldName + '" is not defined for table"' + _table.name + '"');
		}
		// public methods
		this.setField = function(fieldName, value) {
			_fieldCheck(fieldName);
			_updatedFields[fieldName] = value;
		}
		this.setFields = function(fields){
			for(var fieldName in fields)
				this.setField(fieldName, fields[fieldName]);
		}
		this.getField = function(fieldName, encode) {
			_fieldCheck(fieldName);
			if(typeof(_updatedFields[fieldName]) != 'undefined') 
				return _updatedFields[fieldName];
			else {
				var storedString = localStorage.getItem(_getStoreageKey(fieldName));
				if(typeof(encode) == 'undefined' || encode)
					return (storedString && storedString.toString() != 'undefined') ? JSON.parse(storedString) : null;
				else
					return storedString;
			}
		}
		this.emptyField = function(fieldName){
			_fieldCheck(fieldName);
			localStorage.removeItem(_getStoreageKey(fieldName));
		}
		this.save = function(encode) {
			this.table.saveRecord(this, encode);
		}
		this.remove = function() {
			this.table.removeRecord(this);
		}
		// getters
		this.id; this.__defineGetter__("id", function() { return _id; });
				 this.__defineSetter__("id", function(value) { 
				 	if(arguments.callee.caller && arguments.callee.caller.toString().match(/DatabaseTable instance/))
						_id = value; 
					else 
						alert("Database Error:\n\nA record ID may only be set by its parent table when being inserted.");
				});
		this.table; this.__defineGetter__("table", function() { return _table; });
		this.updatedFields; this.__defineGetter__("updatedFields", function() { return _updatedFields; });
	}
	Database = new DatabaseInstance();
}
com.blankcanvasweb.Database();
