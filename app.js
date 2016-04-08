"use strict";

let Sandbox = require('./Sandbox')

let sandbox = new Sandbox({
  "poolSize": 10
})

sandbox.createPool(() => {
  sandbox.run("print 'hello world'", (err, result) => {
    if (err) throw err
    console.log("Result", result)
  })
})


