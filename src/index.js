/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2021-10-09
* Updated at  : 2021-10-10
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
const mysql     = require("mysql");
const is        = require("@jeefo/utils/is");
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


        if (config.auto_connect_enabled) {
            this.connect();
        }
    }

    connect() {
        if (this.pending) return this.pending;

        this.pending = new Promise((resolve, reject) => {
            this.connection.connect(err => {
                if (err) return reject(err);
                const {threadId} = this.connection;
                this.is_connected = true;
                resolve();
                console.log(`[Jeefo MySQL] connceted thread id: [${threadId}].`);
            });
        });

        return this.pending;
    }

    end() {
        return new Promise((resolve, reject) => {
            this.connection.end(err => {
                if (err) return reject(err);

                const {threadId} = this.connection;
                console.log(`[Jeefo MySQL] conncetion thread [${threadId}] is closed.`);
                this.pending = null;
                resolve();
            });
        });
    }

    destroy() {
        this.connection.destroy();
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

    prepare_set(data) {
        return Object.keys(data).map(key => {
            let value = data[key];
            if (is.object(value) && !(value instanceof Date)) {
                value = `'${JSON.stringify(value)}'`;
            }
            return `${key} = ${value}`;
        }).join(", ");
    }

    prepare_fields(fields) {
        if (is.string(fields)) fields = [fields];
        return fields.join(", ");
    }

    prepare_where(where) {
        return Object.keys(where).map(key => {
            let value = where[key];
            if (is.object(value) && !(value instanceof Date)) {
                value = `'${JSON.stringify(value)}'`;
            } else if (typeof value === "string") {
                value = mysql.escapeId(value);
            }
            return `${key} = ${value}`;
        }).join(" AND ");
    }

    exec(query) {
        return new Promise(async (resolve, reject) => {
            console.log(`[Jeefo MySQL] exec query: ${query}`);
            this.connection.query(query, (err, results, fields) => {
                if (err) return reject(err);

                resolve({results, fields});
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

function get_database(table_name, config = default_config) {
    return (
        processes[table_name] ||
        (processes[table_name] = new JeefoMySQLConnection(table_name, config))
    );
}

get_database.config = async cfg => {
    default_config = Object.assign(Object.create(null), cfg);
    if (default_config.auto_connect_enabled === void 0) {
        default_config.auto_connect_enabled = true;
    }
};

get_database.config_load = async filepath => {
    get_database.config(await fs.load_json(filepath));
};

const exit_events = [
    "exit",
    "SIGINT",
    "SIGUSR1",
    "SIGUSR2",
    "SIGTERM",
    "uncaughtException"
];

const cleanup_event = async exit_code => {
    if (exit_code === 0) return;
    if (Object.keys(processes).length === 0) return;

    if (exit_code === "SIGINT") console.log();

    console.log("[Jeefo MySQL] cleaning please wait...");
    process.stdin.resume();

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

module.exports = get_database;