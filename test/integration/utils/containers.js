"use strict";

let Docker = require('dockerode')
let docker = new Docker()


const getRunningContainers = (cb) => {
  const opts = {
    filters: {
      label: ["__docker_sandbox"]
    }
  }
  
  docker.listContainers(opts, function (err, containers) {
    if (err) return cb(err);
    
    let result = containers.filter(function (container) {
      return typeof container.Labels.__docker_sandbox != undefined;
    });
    
    cb(null, result);
  });
}

module.exports = {
  getRunningContainers
}