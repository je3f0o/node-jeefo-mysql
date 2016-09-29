/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : limit.js
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

let is_object = require("jeefo").is_object;

module.exports = limit => {
	let _limit = is_object(limit) ? `${ limit.offset || 0 }, ${ limit.max || 0 }` : limit;
	return ` LIMIT ${ _limit }`;
};
