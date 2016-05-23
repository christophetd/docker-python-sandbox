"use strict";
/* global expect */

let Docker = require('dockerode')
let containerUtils = require('./utils/containers')
let async = require('async')
let Sandbox = require('./../../src/Sandbox')

describe("The sandbox class", () => {
  const docker = new Docker()
  const poolSize = 2
  const enableNetwork = false
  const there = it
  let sandbox = null
  
  beforeEach(() => {
    sandbox = new Sandbox({poolSize, enableNetwork})
  })

  it("should not be any container from the library running in the beginning of the tests", done => {
    containerUtils.getRunningContainers( (err, containers) => {
      expect(err).toBe(null)
      expect(containers.length).toBe(0)
      done()
    })
  })
  
  it("should create a pool of the correct size", done => {
    const poolSize = 1
    const enableNetwork = true
    sandbox = new Sandbox({poolSize, enableNetwork})

    async.waterfall([
      next => sandbox.createPool(next), 
      containerUtils.getRunningContainers,
      (containers, next) => {
        expect(containers.length).toBe(poolSize)
        next()
      }
    ], err => {
      expect(err).toBe(null)
      done()
    })
  }, 60000)
  
  it("should correctly cleanup containers", done => {
    const poolSize = 1
    const enableNetwork = true
    sandbox = new Sandbox({poolSize, enableNetwork})
    async.waterfall([
      next => sandbox.createPool(next),
      next => sandbox.cleanup(next), 
      next => containerUtils.getRunningContainers(next),
      (containers, next) => {
        expect(containers.length).toBe(0)
        next()
      }
    ], (err) => {
      expect(err).toBe(null)
      done()
    })
  }, 60000)
  
  afterEach(done => {
    sandbox.cleanup(done)
  })

})