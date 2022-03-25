/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : test.js
* Created at  : 2021-10-09
* Updated at  : 2022-03-25
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

const mysql = require("./src/index.js");

const assert = (condition, message) => {
  if (condition) return console.log(`ASSERT '${message}' passed.`);
  throw new Error(`ASSERT '${message}' failed.`);
};

(async () => {
  const config = require(`${process.env.HOME}/configs/database.json`);
  config.idle_timeout = 0;
  await mysql.config(config);
  const process_db = mysql("processes");

  await process_db.insert({
    pid     : 321,
    command : "ffmpeg something something".split(' '),
  });

  await process_db.reset();
  await process_db.insert({
    pid     : 123,
    command : "ffmpeg something something".split(' '),
  });

  const results = await process_db.get_all();
  let total = await process_db.total();
  assert(results.length === total, "results.length === total");

  const record = await process_db.first({pid: 123});
  assert(record !== null, "record !== null");

  const r = await process_db.update_first({
    command: 'node index.js'
  }, {pid: 123 }, {fields: ["id", "command"]}, true);

  assert(r !== null, "r !== null");
  assert(record.id === r.id, "record.id !== r.id");
  assert(r.command === "node index.js", 'r.command === "node index.js"');

  await process_db.delete_all();
  total = await process_db.total();
  assert(total === 0, "total length = 0");

  console.log(process_db.prepare_where({id: [1,2,3,4,5]}));
})();