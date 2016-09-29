/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : prepare_insert.js
* Created at  : 2016-09-28
* Updated at  : 2016-09-29
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

let sprintf           = require("jeefo").sprintf,
	escape_identifier = require("mysql").escapeId;

module.exports = (table, data, return_back) => {
	let fields = [], values = [];

	let values_placeholders = Object.keys(data).reduce((result, key) => {
		fields.push(key);
		values.push(data[key]);
		return result + '?, ';
	}, '');

	fields.push("created_at", "updated_at");
	table = escape_identifier(table);

	let query = '';
	if (return_back) {
		query += "START TRANSACTION;";
	}
	query += sprintf(" INSERT INTO { table }({ fields }) VALUES({ values_placeholders }NOW(), NOW());", {
		table,
		fields : escape_identifier(fields),
		values_placeholders,
	});
	if (return_back) {
		query += sprintf(" SELECT * FROM { 0 } ORDER BY `id` DESC LIMIT 1; COMMIT;", table);
	}

	return { query, values };
};
