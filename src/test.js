/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : test.js
* Created at  : 2021-10-09
* Updated at  : 2021-10-09
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

const mysql = require("./connect.js");

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
    console.log(results);
    console.log(total);

    await process_db.delete_all();
    total = await process_db.total();
    console.log(total);

})().catch(console.error.bind(console));