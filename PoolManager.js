"use strict";

let EventEmitter    = require('events').EventEmitter
let _               = require('lodash')
let async           = require('async')
let uuid            = require('node-uuid').v4
let fs              = require('fs-extra')
let Container       = require('./Container')

class PoolManager {
  constructor(docker, options) {
    this.waitingJobs = []
    this.availableContainers = []
    this.emitter = new EventEmitter()
    this.docker = docker
    this.options = options
    this.initialDelayMs = 10000
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
    //startups.push((next) => _.delay(next, this.initialDelayMs));
    
    async.parallel(startups, cb)
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
      async.retryable(retryOptions, container.executeJob.bind(container, job)),
      
      /*
       * The code execution is over. We call the user callback BEFORE
       * cleaning up and replacing the container with a fresh one.
       */
      (result, next) => {
        cb(null, result)
        container.cleanup.bind(() => next(null))
      },
      
      /*
       * We replace the container with a fresh one
       */
      (next) => {
        this._createContainer(next)
      }
    ],
    
    /*
     * If an error occurred in one of the steps above, we try to cleanup the container.
     * It may already have been cleaned, but this does not matter.
     */
    (err) => {
      container.cleanup(_.noop)
    })
  }

  /*
   * Registers a container to the pool
   */
  registerContainer(container) {
    this.availableContainers.push(container)
    if (!_.isEmpty(this.waitingJobs)) {
      const {job, cb} = this.waitingJobs.shift() // ES6 destructuring powa
      return this._executeJob(job, cb)
    }
  }
  
  /*
   * Cleanups the containers in the pool
   *
   * 1) Empty the list of available containers
   * 2) Clean up every container who was in there
   */
  cleanup(cb) {
    cb = cb || _.noop
    const cleanups = this.availableContainers.map(c => c.cleanup.bind(c))
    this.availableContainers.length = 0
    return async.parallel(cleanups, (err)=> { 
      if (err) console.log("[PoolManager] Error while cleaning up -->", err)
      else console.log("all cleanups done !!!!!"); 
      cb(err)
    })
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
      err && console.error(err);
      if (err && container) {
        return container.cleanup(_.partial(cb, err));
      }
      console.info("Container successfuly created")
      cb(null, container)
    })
  }
  
  
  /*
   * Private method
   * Initializes a new container
   */
  _initializeContainer (cb) {
    const id = uuid()
    const tmpDir = `${this.options.tmpDir}/${id}`
    const containerSourceDir = `${__dirname}/container`  //TODO
    const launchOptions = _.cloneDeep(this.options.containerLaunchOptions)
    
    async.waterfall([
      /*
       * Create the temporary directory (and its parents if needed)
       */
      async.apply(fs.ensureDir, tmpDir),
      
      /*
       * Copy the template files to the container's temporary directory
       */
      async.apply(fs.copy, containerSourceDir, tmpDir), 
      
      /*
       * Setup the shared directory
       */
      (next) => {
        launchOptions.HostConfig.Binds = [`${tmpDir}:/usr/src/app`]
        this.docker.createContainer(launchOptions, next)
      }],
      
      (err, instance) => {
        if (err) return cb(err)
        const container = new Container(id, instance, tmpDir)
        cb(null, container)
      }
    )
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
            
        err = err || "unable to retrieve container IP"
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