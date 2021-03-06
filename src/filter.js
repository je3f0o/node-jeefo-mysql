/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : filter.js
* Created at  : 2016-09-27
* Updated at  : 2016-10-02
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

let prepare_select = require("./prepare_select");

module.exports = (connection, database, table, data, callback) => {
	let column_names = Object.keys(data);
	let prepared = prepare_select("INFORMATION_SCHEMA.COLUMNS", {
		$select      : "COLUMN_NAME",
		TABLE_SCHEMA : database,
		TABLE_NAME   : table,
		COLUMN_NAME  : column_names
	});

	if (column_names.length === 0) {
		return callback(null, {}, prepared);
	}

	connection(prepared.query, prepared.values, (err, columns, last_query) => {
		let filtered_data;
		if (columns) {
			columns = columns.map(c => c.COLUMN_NAME);

			filtered_data = columns.reduce((payload, key) => {
				payload[key] = data[key];
				return payload;
			}, {});
		}

		callback(err, filtered_data, last_query);
	});
};
