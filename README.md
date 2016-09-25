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

#### constructor

Accepts as a parameter an optional object with the following properties: 

- *poolSize*: the number of containers to create (defaults to 1)
- *timeoutMs*: the execution timeout (defaults to 10 seconds)
- *memoryLimitMb*: the maximum memory allowed to be used by each containers (defaults to 50 Mo)

#### initialize(callback)

This methods initializes the sandbox by creating the pool of Docker containers.

*callback* is the callback to call when the initialization is completed

#### run(param, callback)

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

## Security

**Please read this section before using blindly the library.** The following are my personal recommendations about what minimal security measures you should follow in order to use this library in a production environment.

Don't run the code that uses this library on your main applications server. I strongly recommend that you keep this code on a separate server exposing an authenticated API, and having no access to any sensitive data.

Yes, yes, I know - you don't have the time nor the desire to implement it. That's why I wrote one for you: 

#### https://github.com/christophetd/code-execution-api-demo

The repository above also includes more specific security guidance (creating a separate user, enabling strict firewall rules, etc.). You can run this API on a separate server (e.g. a AWS instance), and then simply make the appropriate API calls from within your application.

### Aknowledgments

#### 1) Docker is not the most secure way to run untrusted code

The isolation provided by Docker is based on LXC containers, which is a feature of the Linux Kernel. Since the host machine and the containers running the untrusted code share the same kernel, security would be compromized if a vulnerability were to be found in the Linux Kernel. The most secure way to run untrusted code is to use traditional virtual machines, which use their own kernel. Unfortunately this is harder to implement efficiently because VMs use significantly more ressources than containers.

#### 2) Resource limitation is hard and incompletely implemented

Limiting resources used by docker containers is a pretty hard task, and this library only implements the basics: 

- CPU usage is limited to a single core
- Memory usage is limited by default to 50 Mo per container (this number can be changed when creating a new `Sandbox` object)

This means that the following is *not* implemented: 

- I/O limitations
- Disk usage limitations

However, I do believe that the risk is lowered by the fact that the code executed can only run for a finite amount of time (typically a few seconds), after which all the resources it has used are freed (including RAM, disk space, processes, opened files).
