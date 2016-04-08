"use strict";

let _ = require('lodash')

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
   }
   
   executeJob(job, cb) {
      console.log(`I (container ${this.id}), am executing job with code ${job.code}`)
      cb(null, "code result")
   }
   
   get instance() {
      return this.instance
   }
   
   set ip(ip) {
      if (ip) {
         this.ip = ip
      }
   }
}

module.exports = Container