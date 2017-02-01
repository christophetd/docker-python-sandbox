"use strict";

let _ = require('lodash')

class Job {
    constructor(code, language, timeoutMs, cb) {
        this.code = code
        this.language = language
        this.cb = cb || _.noop
        this.timeoutMs = timeoutMs
    }
}

module.exports = Job