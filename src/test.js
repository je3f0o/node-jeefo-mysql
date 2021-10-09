/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : test.js
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

const mysql = require("./index.js");

function assert(condition, message) {
    if (condition) {
        console.log(`ASSERT '${message}' passed.`);
    } else {
        throw new Error(`ASSERT '${message}' failed.`);
    }
}

(async () => {
    await mysql.config_load(`${process.env.HOME}/configs/database.json`);
    const process_db = mysql("processes");

    await process_db.connect();

    await process_db.reset();

    await process_db.insert({
        pid     : 123,
        command : "ffmpeg something something".split(' '),
    });

    const results = await process_db.get_all();
    let total = await process_db.total();
    assert(results.length === total, "results.length === total");

    await process_db.delete_all();
    total = await process_db.total();
    assert(total === 0, "total length = 0");

})().catch(console.error.bind(console));