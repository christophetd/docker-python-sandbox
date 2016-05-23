"use strict";

let _ = require('lodash')

class Job {
    constructor(code, cb) {
        this.code = code
        this.cb = cb || _.noop
    }
}

module.exports = Job