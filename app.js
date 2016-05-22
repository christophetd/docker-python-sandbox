"use strict";

let Sandbox = require('./Sandbox')
var winston = require('winston');
winston.level = 'debug';

let sandbox = new Sandbox({
  "poolSize": 2, 
  "enableNetwork": true
})

sandbox.createPool(() => {
  const codes = [1, 2, 3].map(i => `print "Code ${i}"`)
  console.log(codes)
  codes.forEach(code => {
    sandbox.run(code, (err, result) => console.log(err ? "[app.js] "+err : result))
  })
})

// TODO
// Being able to disable network without error

// Current issue
// (to check)After executing code, the fresh container created doesn't have the time to cleanup at exit

