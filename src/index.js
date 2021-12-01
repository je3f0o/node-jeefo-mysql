/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2021-10-09
* Updated at  : 2021-12-02
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

const fs        = require("@jeefo/fs");
const is        = require("@jeefo/utils/is");
const mysql     = require("mysql");
const processes = Object.create(null);

const AUTO_INC_REGEXP = /AUTO_INCREMENT=\d+/;

let default_config = null;

class JeefoMySQLConnection {
    constructor(table_name, config) {
        if (! is.object(config)) {
            throw new TypeError("Invalid argument");
        }

        this.table_name   = table_name;
        this.connection   = mysql.createConnection(config);
        this.is_connected = false;
    }

    connect() {
        if (this.pending) return this.pending;

        this.pending = new Promise((resolve, reject) => {
            this.connection.connect(err => {
                this.pending = null;
                if (err) return reject(err);
                this.is_connected = true;
                resolve();
                //const {threadId} = this.connection;
                //console.log(`[Jeefo MySQL] connceted thread id: [${threadId}].`);
            });
        });

        return this.pending;
    }

    end() {
        return new Promise((resolve, reject) => this.connection.end(err => {
            this.is_connected = false;
            err ? reject(err) : resolve();
            //const {threadId} = this.connection;
            //console.log(`[Jeefo MySQL] conncetion thread [${threadId}] is closed.`);
        }));
    }

    destroy() {
        this.connection.destroy();
        this.is_connected = false;
    }

    async select(where, options = {}) {
        let {fields} = options;
        fields = fields ? this.prepare_fields(fields) : '*';

        where = where ? ` WHERE ${this.prepare_where(where)}` : '';

        let order = '';
        if (is.string(options.order)) {
            order = ` ORDER BY ${options.order}`;
        }

        let limit = '';
        if (is.number(options.limit)) {
            limit = ` LIMIT ${options.limit}`;
        }

        const tbl   = this.table_name;
        const query = `SELECT ${fields} FROM ${tbl}${where}${order}${limit};`;
        const res = await this.exec(query);

        if (options.limit === 1) return res.results[0];

        return res.results;
    }

    async insert(data, return_back) {
        const fields = this.prepare_set(data);
        const query  = `INSERT INTO ${this.table_name} SET ${fields};`;

        const res = await this.exec(query);

        return (
            return_back
                ? await this.first({id: res.results.insertId})
                : res.results
        );
    }

    /*
    async update(data, where, options) {
        const query = `UPDATE ${tbl} SET ${fields};`;
    }
    */

    async delete(where, options = {}) {
        where = where ? ` WHERE ${this.prepare_where(where)}` : '';

        let order = '';
        if (is.string(options.order)) {
            order = ` ORDER BY ${options.order}`;
        }

        let limit = '';
        if (is.number(options.limit)) {
            limit = ` LIMIT ${options.limit}`;
        }

        const tbl = this.table_name;
        await this.exec(`DELETE FROM ${tbl}${where}${order}${limit};`);
    }

    prepare_fields(fields) {
        if (is.string(fields)) fields = [fields];
        return fields.map(f => mysql.escapeId(f)).join(", ");
    }

    prepare_set(data) {
        return Object.keys(data).map(key => {
            let value = data[key];
            if (is.object(value) && !(value instanceof Date)) {
                value = mysql.escape(JSON.stringify(value));
            } else if (is.string(value)) {
                value = mysql.escape(value);
            }
            key = mysql.escapeId(key);
            return `${key} = ${value}`;
        }).join(", ");
    }

    prepare_where(where) {
        return Object.keys(where).map(key => {
            let value = where[key];
            if (is.object(value) && !(value instanceof Date)) {
                value = mysql.escape(JSON.stringify(value));
            } else if (is.string(value)) {
                value = mysql.escape(value);
            }
            key = mysql.escapeId(key);
            return `${key} = ${value}`;
        }).join(" AND ");
    }

    exec(query) {
        clearTimeout(this.timeout_id);
        return new Promise(async (resolve, reject) => {
            if (!this.is_connected) await this.connect();

            //console.log(`[Jeefo MySQL] exec query: ${query}`);
            this.connection.query(query, (err, results, fields) => {
                if (err) return reject(err);

                resolve({results, fields});
                this.timeout_id = setTimeout(() => this.end(), 10);
            });
        });
    }

    async first(where, options) {
        options = Object.assign({}, options, {limit: 1});
        return await this.select(where, options);
    }

    async reset() {
        const tbl = this.table_name;
        const {results: [result]} = await this.exec(`SHOW CREATE TABLE ${tbl}`);
        const keys = Object.keys(result);
        for (const key of keys) {
            const s = result[key];
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

function get_connection(table_name, config = default_config) {
    return (
        processes[table_name] ||
        (processes[table_name] = new JeefoMySQLConnection(table_name, config))
    );
}

get_connection.config = cfg => {
    default_config = Object.assign({}, cfg);
    if (default_config.auto_connect_enabled === void 0) {
        default_config.auto_connect_enabled = true;
    }
};

get_connection.load_config = async filepath => {
    get_connection.config(await fs.load_json(filepath));
};

/*
const exit_events = [
    "exit",
    "SIGINT",
    "SIGUSR1",
    "SIGUSR2",
    "SIGTERM",
    "uncaughtException"
];

let is_cleaning;
const cleanup_event = async exit_code => {
    if (is_cleaning) return;
    if (exit_code === 0) return;
    if (Object.keys(processes).length === 0) return;

    if (exit_code === "SIGINT") console.log();

    console.log("[Jeefo MySQL] cleaning please wait...");
    process.stdin.resume();
    is_cleaning = true;

    const keys = Object.keys(processes);
    for (const key of keys) {
        const process = processes[key];
        await process.end();
        await process.destroy();
        delete processes[key];
    }

    if (Object.keys(processes).length === 0) process.exit(0);
};

for (const event_name of exit_events) {
    process.on(event_name, cleanup_event);
}
*/

module.exports = get_connection;