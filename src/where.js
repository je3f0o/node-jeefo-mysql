/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : where.js
* Created at  : 2016-09-28
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

let limit             = require("./limit"),
	jeefo             = require("jeefo"),
	is_null           = jeefo.is_null,
	is_array          = jeefo.is_array,
	is_object         = jeefo.is_object,
	order_by          = require("./order_by"),
	escape_identifier = require("mysql").escapeId;

let OPERATORS = jeefo.map({
	$not  : "<>",
	$like : "LIKE",
	$lte  : "<=",
	$gte  : ">=",
	$lt   : "<",
	$gt   : ">"
});

let set_operator = (identifier, object, values) => {
	let keys = Object.keys(object);
	if (keys.length !== 1) {
		console.error(object);
		throw new Error("MySQL Invalid operator object.");
	}
	let key   = keys[0],
		value = object[key];

	key = key.toLowerCase();
	if (key === "$not" && is_null(value)) {
		return `${ identifier } IS NOT NULL`;
	}

	let operator = OPERATORS[key];
	if (! operator) {
		console.error(object);
		throw new Error("MySQL Unknown operator.");
	}

	values.push(value);
	return `${ identifier } ${ operator } ?`;
};

let where = (definition, values) => {
	return Object.keys(definition).filter(key => key[0] !== '$').map(key => {
		let value = definition[key];
		key = escape_identifier(key);

		if (is_null(value)) {
			return `${ key } IS NULL`;
		}
		if (is_array(value)) {
			values.push(value);
			return `${ key } IN(?)`;
		}
		if (is_object(value)) {
			return set_operator(key, value, values);
		}

		values.push(value);
		return `${ key } = ?`;
	}).join(" AND ");
};

let build_where = (definition, values) => {
	let _where = where(definition, values);

	let and_groups = (definition.$groups || []).map(group => {
		return `(${ where(group, values) })`;
	}).join(" AND ");

	if (and_groups) {
		if (_where) {
			_where += " AND ";
		}
		_where += `(${ and_groups })`;
	}

	let or_groups = (definition.$or_groups || []).map(group => {
		return `(${ where(group, values) })`;
	}).join(" OR ");

	if (or_groups) {
		if (_where) {
			_where += " AND ";
		}
		_where += `(${ or_groups })`;
	}

	return _where ? ` WHERE ${ _where }` : '';
};

module.exports = (definition, values) => {
	let result = build_where(definition, values);

	if (definition.$order_by) {
		result += order_by(definition.$order_by);
	}
	if (definition.$limit) {
		result += limit(definition.$limit);
	}

	return result;
};
