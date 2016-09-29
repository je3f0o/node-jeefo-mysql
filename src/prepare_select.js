/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : prepare_select.js
* Created at  : 2016-09-27
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

let where             = require("./where"),
	sprintf           = require("jeefo").sprintf,
	escape_identifier = require("mysql").escapeId;

module.exports = (table, definition, with_count) => {
	let values = [];
	table = escape_identifier(table);

	let query = sprintf("SELECT { select } FROM { table }{ where };", {
		select : definition.$select ? escape_identifier(definition.$select) : '*',
		table,
		where : where(definition, values),
	});

	if (with_count) {
		let limit    = definition.$limit;
		let order_by = definition.$order_by;
		definition.$limit = definition.$order_by = null;

		query += sprintf(" SELECT COUNT(*) AS total FROM { table }{ where };", {
			table,
			where : where(definition, values),
		});

		if (limit) {
			definition.$limit = limit;
		}
		if (order_by) {
			definition.$order_by = order_by;
		}
	}

	return { query, values };
};
