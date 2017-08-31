[![Build Status](https://travis-ci.org/christophetd/docker-python-sandbox.svg)](https://travis-ci.org/christophetd/docker-python-sandbox)

# Docker Python sandbox

As its name suggests, this library is a NodeJS sandbox for executing untrusted Python code in Docker containers.

## [Live Demo](http://ec2-52-50-28-71.eu-west-1.compute.amazonaws.com:3244/)

## Installation

This section describes how to use the library from your NodeJS application.

- [Install Docker](https://docs.docker.com/engine/installation/)
- Install the library: `npm install --save docker-python-sandbox`
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
  - *v3*: boolean indicating if python3 should be used to run the code

**callback** is the callback to be called once the execution is complete. It will be called with 2 parameters: 

- *err*, containing an error if there is one (or `null` otherwise)
- *result*, an object containing the following properties: 
   - *stdout*: the standard output stream of the execution
   - *stderr*: the standard error stream of the execution
   - *combined*: both streams combined
   - *isError*: a boolean indicating if the program executed successfuly, meaning that its exit code was 0 and it didn't timeout
   - *timedOut*: a boolean indicating if the program timed out

## About security

**Please read this section before using blindly the library.** 


### What this library does - and what it does not

This library does: 

- execute the untrusted program in an unprivileged docker container, as an unprivileged user
- limit the maximum amount of memory a container can use
- kill the untrusted program if its execution takes too long, as well as the container it is run in

This library does not: 

- impose any kind of limitations on the I/O usage of the untrusted program
- impose any kind of limitations on the disk space usage of the untrusted program
- impose any kind of limitations on the network usage of the untrusted program

Why? Mainly because these are hard to limit correctly using Docker, and because I believe they should be limited on a higher level that this library (e.g. [disk quotas](https://access.redhat.com/documentation/en-US/Red_Hat_Enterprise_Linux/6/html/Storage_Administration_Guide/ch-disk-quotas.html), AppArmor/SELinux profiles, firewall rules).

The fact that the untrusted programs only run for a limited amount of time (typically a few seconds) and that the resources it uses are freed afterwards also lowers the risk of abusive resource usage.

**Do not run code using this library as root**. If you run code using this library as root, kittens will die. To let a non-root user use Docker, simply add it to the `docker` group: 

```
usermod -a -G docker your-user
```

Please read carefully the section below if you are interested to use this library in production.

### Running it in production

The following are my personal recommendations about what minimal security measures you should follow in order to use this library in a production environment.

Don't run the code that uses this library on your main applications server. I strongly recommend that you keep this code on a separate server exposing an authenticated API, and having no access to any sensitive data.

Yes, yes, I know - you don't have the time nor the desire to implement it. That's why I wrote one for you: 

#### https://github.com/christophetd/code-execution-api-demo

The repository above also includes more specific security guidance (creating a separate user, enabling strict firewall rules, etc.). You can run this API on a separate server (e.g. a AWS instance), and then simply make the appropriate API calls from within your application.

### Limitations

Docker is not the most secure way to run untrusted code.

The isolation provided by Docker is based on LXC containers, which is a feature of the Linux Kernel. Since the host machine and the containers running the untrusted code share the same kernel, security would be compromized if a vulnerability were to be found in the Linux Kernel. The most secure way to run untrusted code is to use traditional virtual machines, which use their own kernel. Unfortunately this is harder to implement efficiently because VMs use significantly more ressources than containers.

**Yet**, a lot of heavely used websites use Docker containers to execute untrusted code. An example is [RemoteInterview](http://remoteinterview.io/).


## Known issues

The library does not work correctly if the docker storage backend used is `devicemapper`. To check what storage backend your docker installation currently uses, run: 

```
you@your-server:~$ docker info | grep "Storage Driver"
Storage Driver: aufs
```

If your installation uses `devicemapper`, I advise to configure it to use aufs instead. See https://docs.docker.com/engine/userguide/storagedriver/aufs-driver/#/configure-docker-with-aufs

## Author

Any issue? Question? Concern? Feel free to open an issue to talk about it or to send me an email at *christophe at tafani dash dereeper dot me*

Thank you to: 
- Bassim Matar for initially having hired me to develop this project for [LiAssistant](https://liassistant.li) and allowing me to open-source it
- Asad from RemoteInterview for some interesting discussions on the subject

