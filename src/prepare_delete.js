/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : prepare_delete.js
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

let where             = require("./where"),
	sprintf           = require("jeefo").sprintf,
	escape_identifier = require("mysql").escapeId;

module.exports = (table, definition) => {
	let values = [];

	let query = sprintf("DELETE FROM { table }{ where };", {
		table : escape_identifier(table),
		where : where(definition, values),
	});

	return { query, values };
};
