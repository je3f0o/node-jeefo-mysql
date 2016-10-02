/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : prepare_update.js
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

let jeefo             = require("jeefo"),
	map               = jeefo.map,
	$where            = require("./where"),
	sprintf           = jeefo.sprintf,
	prepare_select    = require("./prepare_select"),
	get_placeholders  = require("./placeholders"),
	escape_identifier = require("mysql").escapeId;

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
		let copy_where = map(where, { $select });

		let select = prepare_select(table, copy_where);
		query += ` ${ select.query } COMMIT;`;
		values = values.concat(select.values);
	}

	return { query, values };
};
