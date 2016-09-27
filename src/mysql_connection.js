/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : mysql_connection.js
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

let async = require("async"),
	mysql = require("mysql");

let is_undefined = function (value) {
	return value === void 0;
};

let mysql_connect = (config, callback) => {
	let conn = mysql.createConnection({
		host               : config.host,
		user               : config.user,
		password           : config.password,
		database           : config.database,
		dateStrings        : true,
		multipleStatements : true
	});

	conn.connect(err => {
		callback(err, conn);
	});
};

module.exports = (config) => {
	let timeout, connection_instance;

	return (query, values, callback) => {
		if (is_undefined(callback)) {
			callback = values;
			values   = null;
		}

		async.waterfall(
			[
				cb => {
					if (connection_instance) {
						cb(null, connection_instance);
					} else {
						mysql_connect(config, cb);
					}
				},
				(conn, cb) => {
					connection_instance = conn;
					connection_instance.query(query, values, cb);
				}
			],
			function () {
				if (callback) {
					callback.apply(null, arguments);
				}

				clearTimeout(timeout);

				timeout = setTimeout(() => {
					connection_instance.destroy();
					connection_instance = null;
				}, 5000);
			}
		);
	};
};
