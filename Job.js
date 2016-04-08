"use strict";

let _ = require('lodash')

class Job {
    constructor(code, cb) {
        this.code = code
        this.cb = cb || _.noop
    }
    
    execute() {
        console.log("Executing job with the code \n", this.code)
    }
}

module.exports = Job