"use strict";

const expect = require('chai').expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const generateMocks = require('../../helpers/SandboxMocks')
const defaultOptions = require('../../../lib/Sandbox').defaultOptions

describe('Sandbox', () => {
  let mocks
  let Sandbox
  let ourSandbox
  let sandbox
  let sandboxOptions

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    mocks = generateMocks(sandbox)
    sandboxOptions = {
      "poolSize": 777,
      "memoryLimitMb": 777,
      "imageName": "fake/fake-repo",
      "timeoutMs": 777
    }
    Sandbox = proxyquire('../../../lib/Sandbox', mocks)
    ourSandbox = new Sandbox(sandboxOptions)
  })


  afterEach(() => {
    sandbox.restore()
    mocks = null
    Sandbox = null
    ourSandbox = null
  })


  describe('constructor', () => {
    beforeEach(() => {

    })

    it('should set options as expected if some are passed', () => {
      const expected = {
        poolSize: sandboxOptions.poolSize,
        memoryLimitMb: sandboxOptions.memoryLimitMb,
        imageName: sandboxOptions.imageName,
        timeoutMs: sandboxOptions.timeoutMs,
        containerLaunchOptions: {
          "Image": sandboxOptions.imageName,
          "NetworkDisabled": false,
          "AttachStdin": false,
          "AttachStdout": false,
          "AttachStderr": false,
          "OpenStdin": false,
          "Privileged": false,
          "User": "sandboxuser",
          "Tty": false,
          "HostConfig": {
            "Memory": sandboxOptions.memoryLimitMb * 1000000,
            "MemorySwap": -1,
            "Privileged": false,
            "CpusetCpus": "0" // only use one core
          },
          "Labels": {
            "__docker_sandbox": "1"
          },
          ExposedPorts: {
            "3000/tcp": {}
          }
        }
      }

      expect(ourSandbox.options).to.deep.equal(expected)
    })

    it('should set options as expected if none are passed', () => {
      sandboxOptions = {}
      ourSandbox = new Sandbox(sandboxOptions)
      const expected = {
        poolSize: defaultOptions.poolSize,
        memoryLimitMb: defaultOptions.memoryLimitMb,
        imageName: defaultOptions.imageName,
        timeoutMs: defaultOptions.timeoutMs,
        containerLaunchOptions: {
          "Image": sandboxOptions.imageName,
          "NetworkDisabled": false,
          "AttachStdin": false,
          "AttachStdout": false,
          "AttachStderr": false,
          "OpenStdin": false,
          "Privileged": false,
          "User": "sandboxuser",
          "Tty": false,
          "HostConfig": {
            "Memory": sandboxOptions.memoryLimitMb * 1000000,
            "MemorySwap": -1,
            "Privileged": false,
            "CpusetCpus": "0" // only use one core
          },
          "Labels": {
            "__docker_sandbox": "1"
          },
          ExposedPorts: {
            "3000/tcp": {}
          }
        }
      }

      expect(ourSandbox.options).to.deep.equal(expected)
    })

    it('should call new Docker once', () => {
      expect(mocks['dockerode'].callCount).to.deep.equal(1) // not sure where this is first called, might be a test suite quirk
      ourSandbox = new Sandbox(sandboxOptions)
      expect(mocks['dockerode'].callCount).to.deep.equal(2)
    })

    it('should call new PoolManager once with options', () => {
      expect(mocks['./PoolManager'].callCount).to.deep.equal(1) // not sure where this is first called, might be a test suite quirk
      ourSandbox = new Sandbox(sandboxOptions)
      expect(mocks['./PoolManager'].callCount).to.deep.equal(2)
      expect(mocks['./PoolManager'].args[1][1]).to.deep.equal(sandboxOptions)
    })

  })


  describe('initialize', () => {
    it('should call this.manager once with expected params', () => {
      let cb = sandbox.stub()
      ourSandbox.manager.initialize = sandbox.stub()
      ourSandbox.initialize(cb)

      expect(ourSandbox.manager.initialize.callCount).to.deep.equal(1)
      expect(ourSandbox.manager.initialize.args[0][0]).to.deep.equal(sandboxOptions.poolSize)
      expect(ourSandbox.manager.initialize.args[0][1]).to.deep.equal(cb)
    })
  })


  describe('createPool', () => {
    it('should call this.manager once with expected params', () => {
      let cb = sandbox.stub()
      ourSandbox.manager.initialize = sandbox.stub()
      ourSandbox.createPool(cb)

      expect(ourSandbox.manager.initialize.callCount).to.deep.equal(1)
      expect(ourSandbox.manager.initialize.args[0][0]).to.deep.equal(sandboxOptions.poolSize)
      expect(ourSandbox.manager.initialize.args[0][1]).to.deep.equal(cb)
    })
  })


  describe('run', () => {
    let options, cb
    beforeEach(() => {
      options = { code: "print 'hi'", timeoutMs: '10101', v3: true }
      cb = sandbox.stub()
      ourSandbox.manager.executeJob = sandbox.stub()
    })

    it('should throw an error if no code', () => {
      options.code = null
      expect(() => ourSandbox.run(options, cb)).to.throw('Please provide the code to run as a string or an object {code: xxx}')
    })

    it('should throw an error if code is not a string', () => {
      options.code = {}
      expect(() => ourSandbox.run(options, cb)).to.throw('Please provide the code to run as a string or an object {code: xxx}')
    })

    it('should call job once if no errors', () => {
      ourSandbox.run(options, cb)
      expect(mocks['./Job'].callCount).to.deep.equal(1)
    })

    it('should call job with options.code if it exists', () => {
      ourSandbox.run(options, cb)
      expect(mocks['./Job'].args[0][0]).to.deep.equal(options.code)
    })

    it('should call job with options if no code property', () => {
      options = "print 'hello'"
      ourSandbox.run(options, cb)
      expect(mocks['./Job'].args[0][0]).to.deep.equal(options)
    })

    it('should call job with options.timeoutMs if it exists', () => {
      ourSandbox.run(options, cb)
      expect(mocks['./Job'].args[0][1]).to.deep.equal(options.timeoutMs)
    })

    it('should call job with this.options.timeoutMs if no timeoutMs property', () => {
      options = "print 'hello'"
      ourSandbox.run(options, cb)
      expect(mocks['./Job'].args[0][1]).to.deep.equal(sandboxOptions.timeoutMs)
    })

    it('should call job with cb', () => {
      options = "print 'hello'"
      ourSandbox.run(options, cb)
      expect(mocks['./Job'].args[0][2]).to.deep.equal(cb)
    })

    it('should call job with options.v3 if it exists', () => {
      ourSandbox.run(options, cb)
      expect(mocks['./Job'].args[0][3]).to.deep.equal(options.v3)
    })

    it('should call job with false if no option provided', () => {
      options = "print 'hello'"
      ourSandbox.run(options, cb)
      expect(mocks['./Job'].args[0][3]).to.deep.equal(false)
    })

  })


  describe('cleanup', () => {
    let cb
    beforeEach(() => {
      cb = sandbox.stub()
      ourSandbox.manager.cleanup = sandbox.stub()
    })

    it('should call this.manager.cleanup', () => {
      ourSandbox.cleanup(cb)
      expect(ourSandbox.manager.cleanup.callCount).to.be.equal(1)
    })

    it('should call cb if not a bool', () => {
      ourSandbox.cleanup(cb)
      ourSandbox.manager.cleanup.args[0][0]('fakeErr')
      expect(cb.callCount).to.be.equal(1)
      expect(cb.args[0][0]).to.be.equal('fakeErr')
    })

    it('should use noop if cb is undefined', () => {
      cb = undefined
      ourSandbox.cleanup(cb)
      ourSandbox.manager.cleanup.args[0][0]('fakeErr')
      expect(mocks['lodash'].noop.callCount).to.be.equal(1)
      expect(mocks['lodash'].noop.args[0][0]).to.be.equal('fakeErr')
    })



  })


})