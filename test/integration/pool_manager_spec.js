"use strict";
/* global expect */

let Docker = require('dockerode')
let containerUtils = require('./utils/containers')
let async = require('async')
let PoolManager = require('./../../lib/PoolManager')

describe("The PoolManager class", () => {
  let docker = new Docker()
  let pool = null
  
  it("should not be any container from the library running in the beginning of the tests", done => {
    containerUtils.getRunningContainers( (err, containers) => {
      expect(err).toBe(null)
      expect(containers.length).toBe(0)
      done()
    })
  })
  
  it("should create a pool of the correct size", done => {
    const poolSize = 3
    pool = new PoolManager(docker)

    async.waterfall([
      next => pool.initialize(poolSize, next), 
      containerUtils.getRunningContainers,
      (containers, next) => {
        expect(containers.length).toBe(poolSize)
        next()
      }
    ], err => {
      expect(err).toBe(null)
      done()
    })
  })
  
  it("should correctly cleanup containers", done => {
    const poolSize = 3
    const enableNetwork = true
    pool = new PoolManager(docker)
    async.waterfall([
      next => pool.initialize(poolSize, next),
      next => pool.cleanup(next), 
      next => containerUtils.getRunningContainers(next),
      (containers, next) => {
        expect(containers.length).toBe(0)
        next()
      }
    ], (err) => {
      expect(err).toBe(null)
      done()
    })
  })
  
  afterEach(done => {
    if (!pool) return done()
    
    pool.cleanup(done)
  })

})
