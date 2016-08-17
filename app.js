"use strict";

let Sandbox = require('./src/Sandbox')
var log = require('winston');
log.level = 'debug';


let printNumber = (number) =>  `
print "Hello, I am number "+str(${number})
`;

let sandbox = new Sandbox({
  "poolSize": 5, 
  "enableNetwork": true
})

sandbox.createPool((err) => {
 if (err) return console.error("Aborting: "+err)
 log.info("I am now going to print the numbers 1 to 3")
 run(3, 1)
})

let run = function(maxNumber, current) {
 if (current > maxNumber) return;
 
 log.info("Factorial of "+current+"?")
 sandbox.run(printNumber(1), (err, result) => {
  if (err) return console.error("Nope... "+err);
  log.info(result+" !");
 })
 
  log.info("Factorial of "+current+"?")
  sandbox.run(printNumber(2), (err, result) => {
    if (err) return console.error("Nope... "+err);
    log.info(result+" !");
  })
 
  log.info("Factorial of "+current+"?")
  sandbox.run(printNumber(3), (err, result) => {
    if (err) return console.error("Nope... "+err);
    log.info(result+" !");
  })
}
// TODO
// Being able to disable network without error

// Current issue
// (to check)After executing code, the fresh container created doesn't have the time to cleanup at exit

