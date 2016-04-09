"use strict";

let _       = require('lodash')
let async   = require('async')
let fs      = require('fs-extra')
let request = require('request')

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
    
    /* Todo : why is this needed?*/
    this.instance.stop = this.instance.stop.bind(this.instance)
    this.instance.remove = this.instance.remove.bind(this.instance)
  }
   
  executeJob(job, cb) {
    console.log(`I (container ${this.id}), am executing job with code ${job.code}`)
    //this.cleanup(_.partial(cb, null, "code result"))
    const options = {
      url: "http://" + this.ip + ":3000/", 
      json: true, 
      body: {
        code: this.code
      }
    };
    
    cb(null, "code result")
    // TODO: move 'addcontainertopool' method in manager
    // 
  }
   
  instance() {
    return this.instance
  }
   
  setIp(ip) {
    if (ip) {
      this.ip = ip
    }
  }
   
  cleanup(cb) {
    console.log(`Container ${this.instance.id} cleaning up`)
    const stages = [
      this._removeTmpDir.bind(this), 
      this.instance.stop.bind(this), 
      this.instance.remove.bind(this, {force: true})
    ];
    async.series(stages, cb)
  }
  
  _removeTmpDir(cb) {
    fs.remove(this.tmpDir, cb)
  }
}

module.exports = Container