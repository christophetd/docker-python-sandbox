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
  constructor(id, instance) {
    this.id = id
    this.instance = instance
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
        code: job.code, 
        timeoutMs: job.timeoutMs, 
        v3: job.v3
      }, 
      timeout: job.timeoutMs + 500
    };
    
    request.post(options, (err, res) => {
      if (err) {
        if (err.code === "ETIMEDOUT") {
          return cb(null, {
            timedOut: true, 
            isError: true, 
            stderr: "", 
            stdout: "", 
            combined: ""
          })
        }
        return cb(new Error("unable to contact container: " + err))
      }
      
      if (!res || !res.body) 
        return cb(new Error("empty response from container"))
      
      var result = {
        isError: res.body.isError,
        timedOut: res.body.timedOut,
        stderr: res.body.stderr, 
        stdout:  res.body.stdout, 
        combined: res.body.combined, 
        killedByContainer: res.body.killedByContainer === true ? true : false
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
}

module.exports = Container