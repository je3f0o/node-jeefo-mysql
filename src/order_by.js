/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : order_by.js
* Created at  : 2016-09-29
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

let jeefo             = require("jeefo"),
	is_array          = jeefo.is_array,
	is_object         = jeefo.is_object,
	escape_identifier = require("mysql").escapeId;

module.exports = (order) => {
	let orders;

	if (is_object(order) && ! is_array(order)) {
		orders = Object.keys(order).map(key => {
			let value = order[key].toUpperCase();
			key = escape_identifier(key);
			return `${ key } ${ value }`;
		}).join(", ");
	} else {
		orders = escape_identifier(order);
	}

	return ` ORDER BY ${ orders }`;
};
