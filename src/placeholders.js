/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : placeholders.js
* Created at  : 2016-10-02
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

let is_null = require("jeefo").is_null;

module.exports = (object, values) => {
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
