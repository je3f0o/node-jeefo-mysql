/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : call.js
* Created at  : 2016-09-27
* Updated at  : 2016-09-28
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

let jeefo      = require("jeefo"),
	is_null    = jeefo.is_null,
	is_array   = jeefo.is_array,
	is_defined = jeefo.is_defined;

module.exports = (procedure, values) => {
	let values_placeholder = '';

	if (is_array(values)) {
		values_placeholder = values.map(() => '?').join(", ");
	}
	if (is_defined(values) && ! is_null(values)) {
		values_placeholder = '?';
		values = [values];
	}

	procedure = '`$$table.0`'.replace(0, procedure);
	let query = `CALL ${ procedure }(${ values_placeholder })`;

	return { query, values };
};
