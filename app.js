"use strict";

let Sandbox = require('./Sandbox')

let sandbox = new Sandbox({
  "poolSize": 2, 
  "enableNetwork": true
})

sandbox.createPool(() => {
  console.log("Pool ready")
  sandbox.run("print 'hello world'", (err, result) => {
  })
})

// TODO
// Being able to disable network without error

