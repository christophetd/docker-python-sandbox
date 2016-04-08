"use strict";

let _           = require('lodash')
let async       = require('async')
let Container   = require('./Container')
let PoolManager = require('./PoolManager')
let Job         = require('./Job')
let uuid        = require('node-uuid').v4

const defaultOptions = {
  "poolSize": 1,
  "enableNetwork": false, 
  "memoryLimitMb": 50, 
  "imageName": "python_sandbox", 
  "tmpDir": __dirname + "/tmp"
};

const noop = () => {}
const log = {}    

class Sandbox {
    
  constructor(options) {
      this.options = _.defaults(options, defaultOptions)
      
      if (_(this.options.tmpDir).endsWith('/')) {
        this.options.tmpDir = this.options.tmpDir.slice(0, -1)
      }
      
      this.manager = new PoolManager()
      this.containerStartOptions = {
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
      
      process.on('exit', this.cleanup.bind(this));
      //process.on('SIGINT', this.cleanup.bind(this));
      
  }
  
  /*
   *  Initializes the pool and creates required containers
   */
  createPool (cb) {
    const startups = _.range(this.options.poolSize).map(() => this._createContainer.bind(this));
    return async.parallel(startups, cb);
  }
  
  /*
   * Runs the specifed code
   * //TODO: add options
   */
  run (options, cb) {
    let code = _.isObject(options) ? options.code : options;
    if (!code || !_.isString(code))
      throw new Error("Please provide the code to run as a string or an object {code: xxx}")
      
    const job = new Job(code)
    this.manager.executeJob(job, cb)    
  }
  
  /*
   * Private method
   * Initializes a new container and adds it to the pool
   */
  _createContainer(cb) {
    let stages = [
      this._initializeContainer,
      this._getContainerInfo, 
      this._registerContainer
    ].map( (stage) => stage.bind(this) );
    
    async.waterfall(stages, (err, container) => {
      if (err) {
        console.error(err);
        return this._cleanupContainer(container, _.partial(cb, err));
      }
      console.info("Container successfuly created")
      cb(null, container)
    })
  }
  
    
  /* 
   *  Cleanups various resources such as temporary
   *  files and docker containers
   */
  cleanup() {
    this.options.poolSize
    console.log("cleaning up");
  }
  
  
  /*
   * Private method
   * Initializes a new container
   */
  _initializeContainer (cb) {
     cb(null, new Container("abc", null, "/tmp"))
     //const id = uuid()
     //const tmpDir = this.options.tmpDir + "/" + id;
  }
   
 /*
  * Private method
  * Retrieves info of a container
  */
  _getContainerInfo(container, cb) {
    cb(null, container)
  }
    
  /* 
   * Private method
   * Registers a container into the pool
   */
  _registerContainer(container, cb) {
     this.manager.registerContainer(container)
     cb(null, container)
  }
  
  /* 
   * Private method
   * Cleanups the resources used by one container
   */
  _cleanupContainer(container, cb) {
    
  }
}

module.exports = Sandbox