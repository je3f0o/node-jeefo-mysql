/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2016-09-27
* Updated at  : 2016-09-30
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/
//ignore:start
"use strict";

/* global */
/* exported */
/* exported */

//ignore:end

let path        = require("path"),
	config_path = path.resolve(process.cwd(), "config"),
	config      = require(config_path).database,

	call           = require("./src/call"),
	jeefo          = require("jeefo"),
	filter         = require("./src/filter"),
	is_object      = jeefo.is_object,
	is_function    = jeefo.is_function,
	prepare_select = require("./src/prepare_select"),
	prepare_update = require("./src/prepare_update"),
	prepare_insert = require("./src/prepare_insert"),
	prepare_delete = require("./src/prepare_delete"),

	mysql_connection            = require("./src/mysql_connection"),
	mysql_connections_container = {};

let noop = () => {};

// curry functions
let filter_curry = (table, func) => {
	return (table_name, data, callback) => {
		if (is_function(data)) {
			callback = data;
		}
		if (is_object(table_name)) {
			data       = table_name;
			table_name = table;
		}

		return func(table_name, data, callback);
	};
};

let select_curry = (table, func) => {
	return (table_name, definition, callback) => {
		// no definition, no table_name
		if (is_function(table_name)) {
			callback   = table_name;
			table_name = table;
			definition = {};
		} else {
			if (is_function(definition)) {
				callback = definition;
			}
			// no table_name
			if (is_object(table_name)) {
				definition = table_name;
				table_name = table;
			}
		}

		return func(table_name, definition, callback);
	};
};

let update_curry = (table, require_callback, func) => {
	if (is_function(require_callback)) {
		func = require_callback;
	}

	return (table_name, data, where, callback) => {
		// No table passed, which means table_name is data object.
		if (is_object(table_name)) {
			// no where object
			if (is_function(data)) {
				callback = data;
				where    = {};
			// has where object
			} else if (is_function(where)) {
				callback = where;
				where    = data;
			} else if (is_object(data)) {
				where = data;
			} else {
				where = {};
			}
			data       = table_name;
			table_name = table;
		// has table name passed, now where is optional
		} else if (is_function(where)) {
			callback = where;
			where    = {};
		}

		if (! require_callback) {
			callback = callback || noop;
		}

		return func(table_name, data, where, callback);
	};
};

let insert_curry = (table, require_callback, func) => {
	return (table_name, data, callback) => {
		if (is_object(table_name)) {
			callback   = data;
			data       = table_name;
			table_name = table;
		}
		if (! require_callback) {
			callback = callback || noop;
		}
		return func(table_name, data, callback);
	};
};

let delete_curry = (table, func) => {
	return (table_name, where, callback) => {
		if (is_function(table_name)) {
			callback   = table_name;
			table_name = table;
			where      = {};
		} else if (is_object(table_name)) {
			callback   = where;
			where      = table_name;
			table_name = table;
		}
		return func(table_name, where, callback);
	};
};

let make_new_connection = table => {
	let connection = mysql_connections_container[table] = mysql_connection(config, table);

	let exec = (prepared, callback) => {
		connection(prepared.query, prepared.values, callback);
	};

	// Filter
	connection.filter = filter_curry(table, (table_name, data, callback) => {
		filter(connection, config.database, table_name, data, callback);
	});

	// Procedure function
	// TODO: call_curry
	connection.call = (procedure, values, callback) => {
		if (is_function(values)) {
			callback = values;
			values   = null;
		}
		exec(call(procedure, values), (err, results, last_query) => {
			if (callback) {
				callback(err, results && results[0], last_query);
			}
		});
	};

	// Select statement
	connection.prepare_select = select_curry(table, prepare_select);
	connection.find = select_curry(table, (table_name, definition, callback) => {
		exec(prepare_select(table_name, definition), callback);
	});
	connection.first = select_curry(table, (table_name, definition, callback) => {
		definition.$limit = 1;
		exec(prepare_select(table_name, definition), (err, results, last_query) => {
			callback(err, results && results[0], last_query);
		});
	});
	connection.all = callback => {
		connection.find(callback);
	};

	// Select with total
	connection.prepare_select_with_total = select_curry(table, (table_name, definition) => prepare_select(table_name, definition, true));
	connection.find_with_total = select_curry(table, (table_name, definition, callback) => {
		exec(prepare_select(table_name, definition, true), (err, results, last_query) => {
			callback(err, {
				records : (results && results[0]) || [],
				total   : (results && results[1] && results[1][0] && results[1][0].total) || 0
			}, last_query);
		});
	});
	connection.first_with_total = select_curry(table, (table_name, definition, callback) => {
		definition.$limit = 1;
		exec(prepare_select(table_name, definition, true), (err, results, last_query) => {
			callback(err, {
				record : (results && results[0]) || [],
				total  : (results && results[1] && results[1][0] && results[1][0].total) || 0
			}, last_query);
		});
	});

	// Update statement
	connection.prepare_update = update_curry(table, prepare_update);
	connection.update = update_curry(table, (table_name, data, where, callback) => {
		exec(prepare_update(table_name, data, where), callback);
	});
	connection.update_first = update_curry(table, (table_name, data, where, callback) => {
		where.$limit = 1;
		exec(prepare_update(table_name, data, where), callback);
	});
	connection.update_and_back = update_curry(table, true, (table_name, data, where, callback) => {
		exec(prepare_update(table_name, data, where, true), (err, results, last_query) => {
			callback(err, (results && results[2]), last_query);
		});
	});
	connection.update_first_and_back = update_curry(table, true, (table_name, data, where, callback) => {
		where.$limit = 1;
		exec(prepare_update(table_name, data, where, true), (err, results, last_query) => {
			callback(err, (results && results[2] && results[2][0]), last_query);
		});
	});

	// Insert statement
	connection.prepare_insert = insert_curry(table, prepare_insert);
	connection.insert = insert_curry(table, (table_name, data, callback) => {
		exec(prepare_insert(table_name, data), callback);
	});
	connection.insert_and_back = insert_curry(table, true, (table_name, data, callback) => {
		exec(prepare_insert(table_name, data, true), (err, results, last_query) => {
			callback(err, results && results[2] && results[2][0], last_query);
		});
	});

	// Delete statement
	connection.prepare_delete = delete_curry(table, prepare_delete);
	connection.delete = delete_curry(table, (table_name, where, callback) => {
		exec(prepare_delete(table_name, where), callback);
	});
	connection.delete_first = delete_curry(table, (table_name, where, callback) => {
		where.$limit = 1;
		exec(prepare_delete(table_name, where), callback);
	});

	return connection;
};

module.exports = table => {
	return mysql_connections_container[table] || make_new_connection(table);
};
