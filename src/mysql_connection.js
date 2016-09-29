/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : mysql_connection.js
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

let async             = require("async"),
	mysql             = require("mysql"),
	jeefo             = require("jeefo"),
	is_function       = jeefo.is_function,
	escape_identifier = mysql.escapeId,

	mysql_connection_instances = jeefo.map();

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

module.exports = (config, table) => {
	let connection = mysql_connection_instances[table] = {}, timeout;

	let close = () => {
		connection.instance.destroy();
		connection.instance      = null;
		connection.is_connecting = false;
	};

	return (query, values, callback) => {
		if (is_function(values)) {
			callback = values;
			values   = null;
		}
		query = query.replace(/\$\$table/g, table);
		query = query.replace(/\$table/g, escape_identifier(table));

		clearTimeout(timeout);

		async.waterfall(
			[
				cb => {
					if (connection.instance) {
						cb(null, connection.instance);
					} else if (connection.is_connecting) {
						let i = 0;
						(function retry () {
							setTimeout(() => {
								if (connection.instance) {
									cb(null, connection.instance);
								} else if (i < 100) {
									i += 1;
									retry();
								}
							}, 20);
						}());
					} else {
						connection.is_connecting = true;
						mysql_connect(config, cb);
					}
				},
				(conn, cb) => {
					connection.instance = conn;
					conn.query(query, values, cb);
				}
			],
			(err, data) => {
				if (callback) {
					callback(err, data, { query, values });
				}

				clearTimeout(timeout);
				timeout = setTimeout(close, 10000);
			}
		);
	};
};
