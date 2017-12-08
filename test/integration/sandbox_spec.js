"use strict";
/* global expect */

let async   = require('async')
let Sandbox = require('./../../lib/Sandbox')
let _       = require('underscore')

describe("The Sandbox", () => {
  
  const poolSize = 2
  let sandbox = null
  
  beforeEach(done => {
    sandbox = new Sandbox({ poolSize })
    sandbox.createPool(err => {
      if (err) throw err;
      done()
    })
  })
  
  it("should correctly compile a correct python code", done => {
    sandbox.run({ code: 'print "Hello world"' }, (err, result) => {
      expect(err).toBe(null)
      expect(result.stdout).toBe("Hello world\n")
      expect(result.stderr).toBe("")
      expect(result.combined).toBe(result.stdout)
      expect(result.isError).toBe(false)
      expect(result.timedOut).toBeFalsy()
      done()
    })
  }, 15000);
  
  it("should correctly compile a correct python 3 code", done => {
    sandbox.run({ v3: true, code: 'import sys; print("Hello world", file=sys.stdout)' }, (err, result) => {
      expect(err).toBe(null)
      expect(result.stdout).toBe("Hello world\n")
      expect(result.stderr).toBe("")
      expect(result.combined).toBe(result.stdout)
      expect(result.isError).toBe(false)
      expect(result.timedOut).toBeFalsy()
      done()
    })
  })
  
  it("should correctly compile a syntactically incorrect python code", done => {
    sandbox.run('print "Hello world', (err, result) => {
      expect(err).toBe(null)
      expect(result.isError).toBe(true)
      expect(result.stdout).toBe("")
      expect(result.stderr).toContain("SyntaxError: EOL while scanning string literal")
      expect(result.combined).toBe(result.stderr)
      expect(result.timedOut).toBeFalsy()
      done()
    })
  })
  
  it("should correctly stop a program if it times out", done => {
    const code = "import time; time.sleep(10)" // sleeps 10 seconds
    const timeoutMs = 2 * 1000
    sandbox.run({code, timeoutMs}, (err, result) => {
      expect(err).toBe(null)
      expect(result.isError).toBe(true)
      expect(result.timedOut).toBe(true)
      done()
    })
  })
  
  it("should not let a program eat all the memory", done => {
    const code = 'print "Hello world" * 1000000000'
    sandbox.run(code, (err, result) => {
      expect(err).toBe(null)
      expect(result.isError).toBe(true)
      expect(result.timedOut).toBeFalsy()
      expect(result.stdout).toBe("")
      expect(result.combined).toBe(result.stderr)
      expect(result.stderr).toContain("MemoryError")
      done()
    })
  })
  
  it("should correctly run jobs even if there is not enough containers in the pool", done => {
    // Create 2 times more jobs than there is containers
    let codes = _.range(0, 2 * poolSize).map(i => 'print "Hello, world '+i+'"')
    let jobs = codes.map(code => sandbox.run.bind(sandbox, code))
    async.parallel(jobs, (err, results) => {
      expect(err).toBe(null)
      expect(results.length).toBe(codes.length)
      for (let i = 0; i < results.length; ++i) {
        let result = results[i]
        expect(result.isError).toBe(false)
        expect(result.stderr).toBe("")
        expect(result.combined).toBe(result.stdout)
        expect(result.timedOut).toBeFalsy()
        expect(result.stdout).toBe(`Hello, world ${i}\n`)
      }
      done()
    })
  }, 10 * 1000)
  
  afterEach(done => {
    if (!sandbox) return done()
    sandbox.cleanup(done)
    done()
  }, 15000)
})
