"use strict";

let EventEmitter    = require('events').EventEmitter
let _               = require('lodash')
let async           = require('async')

class PoolManager {
  constructor() {
    this.waitingJobs = []
    this.availableContainers = []
    this.emitter = new EventEmitter()
  }
  
  /*
   * Asynchronously runs a job in the pool.
   */
  executeJob (job, cb) {
    cb = cb || _.noop
    if (_.isEmpty(this.availableContainers)) {
      this.waitingJobs.push(job)
    }
    else {
      this._executeJob(job, cb); 
    }
  }
  
  /*
   * Private method. 
   * Assumes there is at least one container available, and runs
   * the job in it
   */
  _executeJob(job, cb) {
    if (_.isEmpty(this.availableContainers))
      throw new Error("no containers available, but there should have been!")
    
    const container = this.availableContainers.shift()
    //container.executeJob(job, cb)
    /*
     * 1) Execute job
     * 2) Cleanup container
     * 3) Create a new container and add it to the pool
     */
    async.waterfall([
      (next) => container.executeJob(job, next),
      (result, next) => {
        cb(null, result)
        container.cleanup(() => next(null, result))//_.partial(next, null, result))
      },
      (result, next) => {
        this._createContainer(next)
      }
    ])
  }

  /*
   * Registers a container to the pool
   */
  registerContainer(container) {
    this.availableContainers.push(container)
    if (!_.isEmpty(this.waitingJobs)) {
      const {job, cb} = this.waitingJobs.shift()
      return this._executeJob(job, cb)
    }
  }
  
  /*
   * Cleanups the containers in the pool
   */
  cleanup(cb) {
    cb = cb || _.noop
    const cleanups = this.availableContainers.map(c => c.cleanup)
    this.availableContainers.length = 0
    return async.parallel(cleanups, cb)
  }
  
  _createContainer(cb) {
    console.log("TODO")
    cb(null)
  }

}

module.exports = PoolManager