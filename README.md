[![Build Status](https://travis-ci.com/christophetd/docker-python-sandbox-v2.svg?token=XndQsXByyZvxbqRRWyCC&branch=master)](https://travis-ci.com/christophetd/docker-python-sandbox-v2)

# Docker Python sandbox

As its name suggests, this library is a NodeJS sandbox for executing untrusted Python code in Docker containers.

## Installation

This section describes how to use the library from your NodeJS application.

- Install Docker
- Install the library: `npm install docker-python-sandbox`
- Pull the docker image used by the library: `docker pull christophetd/docker-sandbox`

## How it works

The library maintains a fixed-size pool of containers. The containers run a minimalistic API only accessible from the host server, exposing an endpoint to execute code. 

![Schema](https://i.imgur.com/i8O7v2a.png)

- A container is only used once to execute code. It is destroyed afterwards and replaced by a fresh one
- Containers cannot communicate with each other
- The execution is subject to certain restrictions (read the *Security* section about that)


### Example use

```javascript
let Sandbox = require('docker-python-sandbox')

const poolSize = 5
let mySandbox = new Sandbox({poolSize})

mySandbox.initialize(err => {
  if (err) throw new Error(`unable to initialize the sandbox: ${err}`)
  
  const code = 'print "Hello, world!"'
  const timeoutMs = 2 * 1000
  
  mySandbox.run({code, timeoutMs}, (err, result) => {
    if (err) throw new Error(`unable to run the code in the sandbox: ${err}`)
    
    console.log(result.stdout); // Hello, world!
  })
});

```

### Methods of the Sandbox class

### constructor

Accepts as a parameter an optional object with the following properties: 

- *poolSize*: the number of containers to create (defaults to 1)
- *timeoutMs*: the execution timeout (defaults to 10 seconds)
- *memoryLimitMb*: the maximum memory allowed to be used by each containers (defaults to 50 Mo)

#### initialize(callback)

This methods initializes the sandbox by creating the pool of Docker containers.

*callback* is the callback to call when the initialization is completed

#### run(param, callbac)

This methods runs a python program in the sandbox. **param** can be: 

- a string containing the code to be run
- an object with the following parameters
  - *code* : the code to be run
  - *timeoutMs* : the time after which the execution should be stopped  

**callback** is the callback to be called once the execution is complete. It will be called with 2 parameters: 

- *err*, containing an error if there is one (or `null` otherwise)
- *result*, an object containing the following properties: 
   - *stdout*: the standard output stream of the execution
   - *stderr*: the standard error stream of the execution
   - *combined*: both streams combined
   - *isError*: a boolean indicating if the program executed successfuly, meaning that its exit code was 0 and it didn't timeout
   - *timedOut*: a boolean indicating if the program timed out

## IMPORTANT : about security

Please, please, do read this section before using blindly the library.
