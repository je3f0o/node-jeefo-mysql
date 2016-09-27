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
	async            = require("async"),
	config_path      = path.resolve(process.cwd(), "config"),
	config           = require(config_path).database,
	mysql_connection = require("./src/mysql_connection");

let mysql_connections_container = {};

let filter = (conn, database, table, data, callback) => {
	let	column_names = Object.keys(data);
	
	async.waterfall(
		[
			cb => {
				let query = `
					SELECT \`COLUMN_NAME\` FROM \`INFORMATION_SCHEMA\`.\`COLUMNS\`
						WHERE
							\`TABLE_SCHEMA\` = ? AND
							\`TABLE_NAME\`   = ? AND
							\`COLUMN_NAME\` IN(?)
				`;

				conn(query, [database, table, column_names], cb);
			},
			(columns, f, cb) => {
				columns = columns.map(c => c.COLUMN_NAME);

				let filtered_data = columns.reduce((payload, key) => {
					payload[key] = data[key];
					return payload;
				}, {});
				
				cb(null, filtered_data);
			}
		],
		callback
	);
};

module.exports = table => {
	let connection = mysql_connections_container[table];

	if (! connection) {
		connection = mysql_connections_container[table] = mysql_connection(config);
		
		connection.filter = (data, callback) => {
			filter(connection, config.database, table, data, callback);
		};
	}

	return connection;
};
