"use strict";

let _ = require('lodash')

class Job {
    constructor(code, timeoutMs, cb) {
        this.code = code
        this.cb = cb || _.noop
        this.timeoutMs = timeoutMs
    }
}

module.exports = Job