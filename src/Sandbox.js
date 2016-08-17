"use strict";

let _           = require('lodash')
let async       = require('async')
let Container   = require('./Container')
let PoolManager = require('./PoolManager')
let Job         = require('./Job')
let fs          = require('fs-extra')
let log         = require('winston')
var Docker      = require('dockerode')

const defaultOptions = {
  "poolSize": 1,
  "enableNetwork": false, 
  "memoryLimitMb": 50, 
  "imageName": "docker_sandbox",
  "tmpDir": __dirname + "/tmp"
};

const noop = () => {}

/*
 * To do: 
 * 
 * - Enable disabling network without bug
 * - Security review
 * - Remove old containers
 */

class Sandbox {
    
  constructor(options) {
      this.options = _.defaults(options, defaultOptions)
      
      if (_(this.options.tmpDir).endsWith('/')) {
        this.options.tmpDir = this.options.tmpDir.slice(0, -1)
      }
      
      this.options.containerLaunchOptions = {
        "Image": this.options.imageName,
        "NetworkDisabled": !this.options.enableNetwork, 
        "AttachStdin": false,
        "AttachStdout": false,
        "AttachStderr": false,
        "OpenStdin": false, 
        "Tty": false,
        "HostConfig": {
            "Memory": this.options.memoryLimitMb * 1000000, 
            "MemorySwap": -1,
            "Privileged": false, 
            "Ulimits": [{
                "Name": "nproc", 
                "Soft": 30, // TODO option
                "Hard": 30
            }]
        }, 
        ExposedPorts: {
          "3000/tcp": {}
        }
      };
      
      this.docker  = new Docker()
      this.manager = new PoolManager(this.docker, options)
      
      const cleanupEvents = ['beforeExit', 'SIGINT']
      const cleanupFn = this.cleanup.bind(this)
      cleanupEvents.map(event => {
        process.on(event, cleanupFn)
      });
      
  }
  
  /*
   *  Initializes the pool and creates required containers
   */
  createPool (cb) {
    this.manager.initialize(this.options.poolSize, cb)
  }
  
  /*
   * Runs the specifed code
   * //TODO: add options
   */
  run (options, cb) {
    let code = _.isObject(options) ? options.code : options;
    if (!code || !_.isString(code))
      throw new Error("Please provide the code to run as a string or an object {code: xxx}")
      
    const job = new Job(code, cb)
    this.manager.executeJob(job) /*, (err, result) => {
      log.debug("");
      //cb = _.partial(cb, err, result)
      //cb()
      cb(err, result);
    })*/
  }
  
      
  /* 
   *  Cleanups various resources such as temporary
   *  files and docker containers
   */
  cleanup(cb) {
    log.debug("cleaning up")
    cb = cb || _.noop
    this.manager.cleanup( err => {
      cb(err)
    })
  }
  
}

module.exports = Sandbox