"use strict";

let _       = require('lodash')
let async   = require('async')
let request = require('request')
let fs      = require('fs-extra')

/*
 * A class representing a Docker container.
 *
 * The "instance" field corresponds to a Dockerode container instance
 */
class Container {
  constructor(id, instance, tmpDir) {
    this.id = id
    this.instance = instance
    this.tmpDir = tmpDir
    this.ip = ""
    this.cleanedUp = false
    
    /* Todo : why is this needed?
    this.instance.stop = this.instance.stop.bind(this.instance)
    this.instance.remove = this.instance.remove.bind(this.instance)*/
  }
   
  /* 
   * Executes a job inside the container
   */
  executeJob(job, cb) {
    const options = {
      url: "http://" + this.ip + ":3000/", 
      json: true, 
      body: {
        code: job.code
      }, 
      timeout: 3000
    };
    
    console.log(options.url)
    
    request.post(options, (err, res) => {
      if (err) return cb("unable to contact container: " + err)
      if (!res.body) return cb("empty response from container")
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n"+res.body)
      cb(null, res.body)
    })
  }
   
  instance() {
    return this.instance
  }
   
  setIp(ip) {
    if (ip) {
      this.ip = ip
    }
  }
   
   
  /*
   * Cleans up the resources used by the container.
   */
  cleanup(cb) {
    if (this.cleanedUp === true) {
      return async.nextTick(cb)
    }
    
    console.log(`Container ${this.instance.id} cleaning up`)
    const stages = [
      /*
       * Remove the container's temporary directory
       */
      (next) => this._removeTmpDir(next), 
      
      /*
       * Stop the container
       */
      this.instance.stop,
      
      /*
       * Remove the container
       */
      async.apply(this.instance.remove, {force: true}),
      
      /*
       * Mark the container as cleaned up
       */
      (next) => {
        this.cleanedUp = true
        async.nextTick(next)
      }
    ];
    
    async.series(stages, cb)
  }
  
  _removeTmpDir(cb) {
    console.log(`\tremoving tmp dir ${this.tmpDir}`)
    fs.remove(this.tmpDir, cb)
  }
}

module.exports = Container