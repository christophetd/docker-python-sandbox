"use strict";

let Sandbox = require('./Sandbox')

let sandbox = new Sandbox({
  "poolSize": 1
})

sandbox.createPool(() => {
  sandbox.run("print 'hello world'", (err, result) => {
    if (err) console.error("ERROR", err)
    else console.log("Result", result)
  })
})


