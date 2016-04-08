"use strict";

let EventEmitter    = require('events').EventEmitter
let _               = require('lodash')

class PoolManager {
  constructor() {
    this.jobs = []
    this.availableContainers = []
    this.emitter = new EventEmitter()
  }
  
  /*
   * Asynchronously runs a job in the pool.
   */
  executeJob (job, cb) {
    cb = cb || _.noop
    if (_.isEmpty(this.availableContainers)) {
      this.emitter.once('newContainer', this._executeJob.bind(this, job, cb))
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
    
    container.executeJob(job, cb)
  }

  /*
   * Registers a container to the pool
   */
  registerContainer(container) {
    this.availableContainers.push(container)
    this.emitter.emit('newContainer')
  }

}

module.exports = PoolManager