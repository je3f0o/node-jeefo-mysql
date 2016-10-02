/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : prepare_insert.js
* Created at  : 2016-09-28
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

let sprintf           = require("jeefo").sprintf,
	get_placeholders  = require("./placeholders"),
	escape_identifier = require("mysql").escapeId;

module.exports = (table, data, return_back) => {
	let values = [];
	let fields = get_placeholders(data, values);
	fields += "`created_at` = NOW(), `updated_at` = NOW()";
	table = escape_identifier(table);

	let query = '';
	if (return_back) {
		query += "START TRANSACTION;";
	}
	query += sprintf(" INSERT INTO { table } SET { fields };", { table, fields });
	if (return_back) {
		query += sprintf(" SELECT * FROM { 0 } ORDER BY `id` DESC LIMIT 1; COMMIT;", table);
	}

	return { query, values };
};
