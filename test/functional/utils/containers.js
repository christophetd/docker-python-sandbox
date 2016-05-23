"use strict";

let Docker = require('dockerode')
let docker = new Docker()


const getRunningContainers = (cb) => {
  const opts = {
    filters: {
      label: ["__docker_sandbox"]
    }
  }
  
  docker.listContainers(opts, cb)
}

module.exports = {
  getRunningContainers
}