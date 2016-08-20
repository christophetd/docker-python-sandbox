"use strict";

let _       = require('lodash')
let async   = require('async')
let request = require('request')
let fs      = require('fs-extra')
let log     = require('winston')

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
    
    request.post(options, (err, res) => {
      if (err) return cb(new Error("unable to contact container: " + err))
      if (!res.body) return cb(new Error("empty response from container"))
      
      var result = {
        isError: res.statusCode != 200, 
        stderr: res.body.stderr, 
        stdout:  res.body.stdout, 
        combined: res.body.combined
      }
      
      cb(null, result)
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
    
    const stages = [
      /*
       * Remove the container's temporary directory
       */
      (next) => this._removeTmpDir(next), 
      
      /*
       * Stop the container
       */
      this.instance.stop.bind(this.instance),
      
      /*
       * Remove the container
       */
      this.instance.remove.bind(this.instance, {force: true}),
      
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
    fs.remove(this.tmpDir, cb)
  }
}

module.exports = Container