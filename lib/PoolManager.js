"use strict";

let EventEmitter    = require('events').EventEmitter
let _               = require('lodash')
let async           = require('async')
let uuid            = require('uuid').v4
let fs              = require('fs-extra')
let log             = require('winston')
let Container       = require('./Container')


const DEFAULT_OPTIONS = {
  containerLaunchOptions: {
    "Image": "christophetd/docker-sandbox",
    "NetworkDisabled": false, 
    "AttachStdin": false,
    "AttachStdout": false,
    "AttachStderr": false,
    "OpenStdin": false, 
    "Privileged": false,
    "User": "sandboxuser",
    "Tty": false,
    "HostConfig": {
        "Memory": 50 * 1000000, 
        "MemorySwap": -1,
        "Privileged": false, 
        "CpusetCpus": "0" // only use one core
    }, 
    "Labels": {
      "__docker_sandbox": "1"
    },
    ExposedPorts: {
      "3000/tcp": {}
    }
  }
};

class PoolManager {
  constructor(docker, options) {
    this.waitingJobs = []
    this.availableContainers = []
    this.bootingContainers = []
    this.emitter = new EventEmitter()
    this.docker = docker
    this.options = options || DEFAULT_OPTIONS;
    this.initialDelayMs = 1000
  }
  
  /*
   * Start a number of containers equals to the size of the pool.
   *
   * After creating the containers, the call to the user callback will be
   * intentionally delayed to give the containers the time to initialize and be
   * ready
   */
  initialize(size, cb) {
    if (size <= 0) 
      throw new Error("invalid pool size")
      
    let startups = _.range(size).map(() => this._createContainer.bind(this));
    log.debug("Creating the container pool", {size: size})
    async.parallel(startups, (err, data) => cb(err))
  }
  
  /*
   * Asynchronously runs a job in the pool.
   */
  executeJob (job, cb) {
    cb = cb || _.noop
    if (_.isEmpty(this.availableContainers)) {
      log.debug("[pool] No container available, adding a new job to the queue")
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
    log.debug("[pool] Executing a new job", {'executor': container.id })
    const retryOptions = {
      times: 10, 
      interval: 500
    }
    /*
     * 1) Execute job
     * 2) Cleanup container
     * 3) Create a new container and add it to the pool
     */
    async.waterfall([
      async.retryable(retryOptions, (next) => container.executeJob(job, next)),
      
      /*
       * The code execution is over. We call the user callback BEFORE
       * cleaning up and replacing the container with a fresh one.
       */
      (result, next) => {
        log.debug('[pool] code execution done')
        job.cb(null, result)
        // Note: we don't pass 'next' as a callback to the container
        // cleanup function. In some cases, the container is already shut down
        // and we don't care about it
        container.cleanup(_.noop)
        next()
      },
      
      /*
       * We replace the container with a fresh one
       */
      (next) => {
        log.debug('[pool] replacing the container by a new one')
        process.nextTick(this._createContainer.bind(this, next));
      }
    ],
    
    /*
     * If an error occurred in one of the steps above, we try to cleanup the container.
     * It may already have been cleaned, but this does not matter.
     */
    (err) => {
      log.debug('[pool] container successfuly replaced by a new one')
      err && log.debug("[PoolManager.executeJob] error: "+err)
      container.cleanup(_.noop)
      cb(err)
    })
  }

  /*
   * Registers a container to the pool
   */
  registerContainer(container) {
    // First, remove the container from the list of booting containers
    var bootingContainerPos = this.bootingContainers.indexOf(container)
    if (bootingContainerPos >= 0) {
      this.bootingContainers.splice(bootingContainerPos, 1)
    }
    
    this.availableContainers.push(container)
    if (!_.isEmpty(this.waitingJobs)) {
      log.debug("[registerContainer] There are "+this.waitingJobs.length+" waiting job",{waitingJobs: this.waitingJobs})
      const waitingJobObject = this.waitingJobs.shift() 
      this._executeJob(waitingJobObject, _.noop) // waitingJobObject.cb)
    }
  }
  
  /*
   * Cleanups the containers in the pool
   *
   * 1) Empty the list of available containers
   * 2) Clean up every container who was in there
   */
  cleanup(cb) {
    log.debug("[pool] cleaning up all containers")
    cb = cb || _.noop
    const runningContainersCleanups = this.availableContainers.map(c => c.cleanup.bind(c))
    const bootingContainersCleanups = this.bootingContainers.map(c => c.cleanup.bind(c))
    this.availableContainers.length = 0
    return async.parallel(runningContainersCleanups.concat(bootingContainersCleanups), err => cb(err));
  }

  
  /*
   * Private method
   * Initializes a new container and adds it to the pool
   *
   * 1) Create the container
   * 2) Start the container
   * 3) Retrieve various information (such as IP address) from the container
   * 4) Wait until the container is ready
   * 5) Add the container to the pool
   */
  _createContainer(cb) {
    const stages = [
      this._initializeContainer,
      this._startContainer,
      this._getContainerInfo, 
      (container, next) => _.delay(next, this.initialDelayMs, null, container),
      this._registerContainer, 
    ].map( stage => stage.bind(this) );
    
    /* 
     * Execute all the above steps. If an error occurs,
     * try to cleanup the container
     */
    async.waterfall(stages, (err, container) => {
      if (err) {
        log.error(err)
        if (container && container.cleanup) {
          container.cleanup(_.partial(cb, err));
        }
        return;
      }
      log.debug("Container successfuly created", {id: container.id})
      cb(null, container)
    })
  }
  
  
  /*
   * Private method
   * Initializes a new container
   */
  _initializeContainer (cb) {
    this.docker.createContainer(this.options.containerLaunchOptions, (err, instance) => {
      if (err) return cb(err)
      const container = new Container(uuid(), instance)
      this.bootingContainers.push(container)
      cb(null, container)
    });
    
  }
  
  /* 
   * Private method
   * Starts the specified container
   */
  _startContainer(container, cb) {
    container.instance.start( (err, data) => {
      if (err) {
        return container.cleanup(_.partial(cb, err))
      }
      cb(null, container)
    })
  }
   
 /*
  * Private method
  * Retrieves info of a container
  */
  _getContainerInfo(container, cb) {
    container.instance.inspect( (err, data) => {
      if (err || !data || !data.NetworkSettings || !data.NetworkSettings.IPAddress 
          || data.NetworkSettings.IPAddress.length == 0) {
            
        err = err || new Error("unable to retrieve container IP")
        return container.cleanup(_.partial(cb, err))
      }
      container.setIp(data.NetworkSettings.IPAddress)
      cb(null, container)
    })
  }
    
  /* 
   * Private method
   * Registers a container into the pool
   */
  _registerContainer(container, cb) {
     this.registerContainer(container)
     cb(null, container)
  }

}

module.exports = PoolManager