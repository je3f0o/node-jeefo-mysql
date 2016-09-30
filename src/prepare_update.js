/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : prepare_update.js
* Created at  : 2016-09-27
* Updated at  : 2016-10-01
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

let jeefo             = require("jeefo"),
	$where            = require("./where"),
	is_null           = jeefo.is_null,
	sprintf           = jeefo.sprintf,
	prepare_select    = require("./prepare_select"),
	escape_identifier = require("mysql").escapeId;

let get_placeholders = (object, values) => {
	return Object.keys(object).reduce((result, key) => {
		let value = object[key];
		key = "`0`".replace(0, key);

		if (is_null(value)) {
			return `${ result }${ key } = NULL, `;
		}

		values.push(value);
		return `${ result }${ key }= ?, `;
	}, '');
};

module.exports = (table, data, where, return_back) => {
	let values = [];
	let fields = get_placeholders(data, values);
	fields += "`updated_at` = NOW()";

	let query = '';
	if (return_back) {
		query += "START TRANSACTION; ";
	}
	query += sprintf("UPDATE { table } SET { fields }{ where };", {
		table : escape_identifier(table),
		fields,
		where : $where(where, values),
	});
	if (return_back) {
		let $select = Object.keys(data);
		$select.push("updated_at");
		let copy_where = jeefo.map(where, { $select });

		let select = prepare_select(table, copy_where);
		query += ` ${ select.query } COMMIT;`;
		values = values.concat(select.values);
	}

	return { query, values };
};
