/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2021-10-09
* Updated at  : 2022-05-04
* Author      : jeefo
* Purpose     :
* Description :
* Reference   :
.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.*/
// ignore:start
"use strict";

/* globals*/
/* exported*/

// ignore:end

const fs    = require("@jeefo/fs");
const is    = require("@jeefo/utils/is");
const mysql = require("mysql");

const config_map      = new Map();
const named_instances = new Map();
const AUTO_INC_REGEXP = /AUTO_INCREMENT=\d+/;
const default_options = {
  max_retry                 : 10,
  retry_interval            : 2000,
  idle_timeout              : 10000,
  is_persistent             : false,
  is_auto_reconnect_enabled : true,
};

let default_config = null;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const async_connect = config => new Promise((resolve, reject) => {
  const connection = mysql.createConnection(config);
  connection.connect(err => err ? reject(err) : resolve(connection));
});

const mock_query = (instance, connection, config) => {
  connection.on("error", err => {
    if (err.fatal && config.is_auto_reconnect_enabled) {
      instance.state = "reconnecting";
      instance.reconnect();
    }
    else throw err;
  });

  connection.jeefo_query = request => {
    if (request.callback) {
      if (instance.state === "stable") {
        const {query, values, callback} = request;
        //console.log(`[Jeefo MySQL] exec query: ${query}`);
        connection.query(query, values, callback);
      }
    } else {
      return new Promise((resolve, reject) => {
        request.callback = (err, results, fields) => {
          if (err) {
            if (!err.fatal) reject(err);
          } else {
            resolve({results, fields});
          }
        };

        connection.jeefo_query(request);
      });
    }
  };
};

class JeefoMysqlQuery {
  constructor(query, values) {
    this.query  = query;
    this.values = values;
  }

  toString() { return this.query; }
}

const limit_query = options => {
  if (is.number(options.limit)) {
    const offset = is.number(options.offset) ? options.offset : 0;
    return ` LIMIT ${offset}, ${options.limit}`;
  }
  return '';
};

class JeefoMySQLConnection {
  constructor(table_name, config) {
    if (!is.object(config)) throw new TypeError("Invalid argument");
    this.state                    = "idle";
    this.queue                    = new Set();
    this.table_name               = table_name;
    this.connection_error_counter = 0;
    config_map.set(this, config);
  }

  reconnect() {
    if (this.pending) return this.pending;
    const config = config_map.get(this);

    this.pending = new Promise(async (resolve, reject) => {
      while (this.connection_error_counter < config.max_retry) {
        if (this.connection_error_counter) {
          const counter = this.connection_error_counter + 1;
          console.error(`[Jeefo MySQL] Trying to reconnect: ${counter}`);
        }
        try {
          const connection = await async_connect(config);
          mock_query(this, connection, config);

          this.state = "stable";
          for (const request of this.queue) {
            connection.jeefo_query(request);
          }

          this.pending                  = null;
          this.connection               = connection;
          this.connection_error_counter = 0;
          return resolve(connection);
        } catch (e) {
          if (e.fatal) {
            this.connection_error_counter += 1;
            await sleep(config.retry_interval);
          } else {
            return reject(e);
          }
        }
      }

      reject(new Error("[Jeefo MySQL] Error: Max retry reached."));
    });

    return this.pending;
  }

  destroy() {
    this.connection.destroy();
    this.connection = null;
    this.state = "idle";
  }

  async exec(query, values = []) {
    if (!this.connection) await this.reconnect();

    const request = {query, values};
    this.queue.add(request);
    const result = await this.connection.jeefo_query(request);
    this.queue.delete(request);

    const config = config_map.get(this);
    if (!config.is_persistent) {
      if (config.idle_timeout) {
        clearTimeout(this.timeout_id);
        this.timeout_id = setTimeout(() => this.destroy(), config.idle_timeout);
      } else {
        this.destroy();
      }
    }

    return result;
  }

  async select(where, options = {}) {
    let {fields} = options;
    fields = fields ? this.prepare_fields(fields) : '*';

    where = this.prepare_where(where);

    const order = is.string(options.order) ? ` ORDER BY ${options.order}` : '';
    const limit = limit_query(options);

    const tbl       = this.table_name;
    const query     = `SELECT ${fields} FROM ${tbl}${where}${order}${limit};`;
    const {results} = await this.exec(query, where.values);

    return options.limit === 1 ? results[0] : results;
  }

  async insert(data, return_back) {
    const set   = this.prepare_set(data);
    const query = `INSERT INTO ${this.table_name} SET ${set};`;

    const res = await this.exec(query, set.values);

    return (
      return_back
        ? await this.first({id: res.results.insertId})
        : res.results
    );
  }

  async update(data, where, options, return_back) {
    const set = this.prepare_set(data);
    where   = this.prepare_where(where);
    if (is.boolean(options)) {
      return_back = options;
      options     = {};
    } else {
      options = options || {};
    }

    const order = is.string(options.order) ? ` ORDER BY ${options.order}` : '';
    const limit = limit_query(options);

    const tbl   = this.table_name;
    const query = `UPDATE ${tbl} SET ${set}${where}${order}${limit};`;
    const res = await this.exec(query, [...set.values, ...where.values]);

    if (return_back) {
      let {fields} = options;
      fields = fields ? this.prepare_fields(fields) : '*';
      const query = `SELECT ${fields} FROM ${tbl}${where}${order}${limit};`;
      const {results} = await this.exec(query, where.values);
      return options.limit === 1 ? results[0] : results;
    }

    return res;
  }

  update_first(data, where, options, return_back) {
    return this.update(data, where, {...options, limit: 1}, return_back);
  }

  delete(where, options = {}) {
    where = this.prepare_where(where);

    const order = is.string(options.order) ? ` ORDER BY ${options.order}` : '';
    const limit = limit_query(options);

    const tbl   = this.table_name;
    const query = `DELETE FROM ${tbl}${where}${order}${limit};`;
    return this.exec(query, where.values);
  }

  delete_first(where, options) {
    return this.delete(where, {...options, limit: 1});
  }

  prepare_fields(fields) {
    if (is.string(fields)) fields = [fields];
    return fields.map(f => mysql.escapeId(f)).join(", ");
  }

  prepare_set(data) {
    const values = [];
    const fields = [];
    for (let [key, value] of Object.entries(data)) {
      if (value === null) {
        fields.push(`${mysql.escapeId(key)} = NULL`);
      } else {
        if (is.object(value) && !(value instanceof Date)) {
          value = JSON.stringify(value);
        }
        values.push(value);
        fields.push(`${mysql.escapeId(key)} = ?`);
      }
    }

    return new JeefoMysqlQuery(fields.join(", "), values);
  }

  prepare_where(where) {
    if (!where) return new JeefoMysqlQuery('', []);

    const values     = [];
    const conditions = [];

    for (let [key, value] of Object.entries(where)) {
      if (value === null) {
        conditions.push(`${mysql.escapeId(key)} IS NULL`);
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(", ");
        values.push(...value);
        conditions.push(`${mysql.escapeId(key)} IN(${placeholders})`);
      } else {
        if (is.object(value) && !(value instanceof Date)) {
          value = JSON.stringify(value);
        }
        values.push(value);
        conditions.push(`${mysql.escapeId(key)} = ?`);
      }
    }

    return new JeefoMysqlQuery(` WHERE ${conditions.join(" AND ")}`, values);
  }

  first(where, options) {
    return this.select(where, {...options, limit: 1});
  }

  async reset() {
    const tbl = this.table_name;
    const {results: [result]} = await this.exec(`SHOW CREATE TABLE ${tbl}`);
    for (const [, s] of Object.entries(result)) {
      if (typeof s === "string" && s.startsWith("CREATE TABLE")) {
        const query = s.replace(AUTO_INC_REGEXP, "AUTO_INCREMENT=0");

        await this.exec(`DROP TABLE ${tbl};`);
        await this.exec(query);
      }
    }
  }

  get_all()    { return this.select(); }
  delete_all() { return this.delete(); }

  async total() {
    const query = `SELECT COUNT(*) as total FROM ${this.table_name};`;
    const {results: [{total}]} = await this.exec(query);
    return total;
  }
}

function get_connection(table_name, config) {
  config = {...default_options, ...default_config, ...config};
  if (named_instances.has(table_name)) {
   return named_instances.get(table_name);
  }

  const instance = new JeefoMySQLConnection(table_name, config);
  named_instances.set(table_name, instance);
  return instance;
}

get_connection.config = cfg => {
  default_config = Object.assign({}, default_options, cfg);
};

get_connection.load_config = async filepath => {
  get_connection.config(await fs.load_json(filepath));
};

module.exports = get_connection;