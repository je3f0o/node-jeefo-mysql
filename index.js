/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2016-09-27
* Updated at  : 2016-09-27
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

let path             = require("path"),
	config_path      = path.resolve(process.cwd(), "config"),
	config           = require(config_path).database,
	mysql_connection = require("./src/mysql_connection");

let mysql_connection_instances = {};

module.exports = table => {
	return mysql_connection_instances[table] || (
		mysql_connection_instances[table] = mysql_connection(config)
	);
};
