const expect = require('chai').expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const generateMocks = require('../../helpers/PoolManagerMocks')
const DEFAULT_OPTIONS = require('../../../lib/PoolManager').DEFAULT_OPTIONS

describe('PoolManager', () => {
  let mocks
  let PoolManager
  let poolManager
  let sandbox
  let docker
  let options

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    mocks = generateMocks(sandbox)
    docker = {
      createContainer: sandbox.stub()
    }
    options = {
      blah: sandbox.stub()
    }
    PoolManager = proxyquire('../../../lib/PoolManager', mocks)
    poolManager = new PoolManager(docker, options)
  })


  afterEach(() => {
    sandbox.restore()
    mocks = null
    PoolManager = null
    poolManager = null
  })


  describe('constructor', () => {
    it('should pass expected items to constructor and call expected classes', () => {
      const expected = {
        waitingJobs: []
        , availableContainers: []
        , bootingContainers: []
        , emitter: {}
        , docker
        , options
        , initialDelayMs: 1000
      }

      expect(poolManager).to.deep.equal(expected)
      expect(mocks['events'].EventEmitter.callCount).to.be.equal(1)
    })

    it('should pass default options to constructor when no options provided', () => {
      poolManager = new PoolManager(docker/*, options*/)
      expect(poolManager.options).to.deep.equal(DEFAULT_OPTIONS)
    })
  })


  describe('initialize', () => {
    let size, cb
    beforeEach(() => {
      size = 7
      cb = sandbox.stub()
      poolManager._createContainer.bind = sandbox.stub()
    })

    afterEach(() => {

    })

    it('should throw an error if size is <= 0', () => {
      size = 0
      expect(() => { poolManager.initialize(size, cb) }).to.throw('invalid pool size')
      size = -10
      expect(() => { poolManager.initialize(size, cb) }).to.throw('invalid pool size')
    })

    it('should call async.parallel', () => {
      poolManager.initialize(size, cb)

      expect(mocks['async'].parallel.callCount).to.be.equal(1)
    })

    it('should call this._createContainer.bind(this) for each desired container and pass them to async.parallel', () => {
      poolManager.initialize(size, cb)

      expect(mocks['async'].parallel.args[0][0]).to.have.a.lengthOf(size)
      expect(poolManager._createContainer.bind.callCount).to.be.equal(size)
      expect(poolManager._createContainer.bind.args[0][0]).to.be.equal(poolManager)
    })

    it('should provide async.parallel with a function that calls the callback when called', () => {
      mocks['async'].parallel = sandbox.stub().callsArgWith(1, 'fakeErr', 'fakeDaya')
      poolManager.initialize(size, cb)

      expect(cb.callCount).to.be.equal(1)
      mocks['async'].parallel.args[0][1]()
      expect(cb.callCount).to.be.equal(2)
      expect(cb.args[0][0]).to.be.equal('fakeErr')
    })

  })


  describe('executeJob', () => {
    let job, cb
    beforeEach(() => {
      job = { fake: 'job' }
      cb = sandbox.stub()
      poolManager._executeJob = sandbox.stub()
    })

    afterEach(() => {

    })

    it('should push the job into the waiting container pool if none available', () => {
      poolManager.availableContainers = []
      expect(poolManager.waitingJobs).to.deep.equal([])
      poolManager.executeJob(job, cb)
      expect(poolManager.waitingJobs).to.deep.equal([job])
    })

    it('should call this._executeJob once with expected args otherwise', () => {
      poolManager.availableContainers = [{ not: 'empty' }]
      poolManager.executeJob(job, cb)
      expect(poolManager._executeJob.callCount).to.be.equal(1)
      expect(poolManager._executeJob.args[0][0]).to.be.equal(job)
      expect(poolManager._executeJob.args[0][1]).to.be.equal(cb)
    })

    it('should call this._executeJob once with expected args otherwise', () => {
      poolManager.availableContainers = [{ not: 'empty' }]
      poolManager.executeJob(job)
      expect(poolManager._executeJob.args[0][1]).to.be.equal(mocks['lodash'].noop)
    })

  })


  describe('_executeJob', () => {
    let job, cb, jobCb, execJobStub, cleanupStub
    beforeEach(() => {
      jobCb = sandbox.stub()
      job = {
        fake: 'job'
        , cb: jobCb
      }
      cb = sandbox.stub()
      execJobStub = sandbox.stub()
      cleanupStub = sandbox.stub()
      poolManager.availableContainers = [ { not: 'empty' } ]
      poolManager.availableContainers.shift = sandbox.stub().returns({
        executeJob: execJobStub
        , cleanup: cleanupStub
      })
      poolManager._createContainer.bind = sandbox.stub()
      process.nextTick = sandbox.stub()
    })

    afterEach(() => {

    })

    it('should throw an error if no available container', () => {
      poolManager.availableContainers = []
      expect(() => { poolManager._executeJob(job, cb) }).to.throw('no containers available, but there should have been!')
    })

    it('should call shift method', () => {
      const r = poolManager._executeJob(job, cb)
      expect(poolManager.availableContainers.shift.callCount).to.be.equal(1)

    })

    describe('call to async.waterfull', () => {
      it('should call async.retryable once', () => {
        const r = poolManager._executeJob(job, cb)
        expect(mocks['async'].retryable.callCount).to.be.equal(1)

      })

      it('should pass async.retryable interval options', () => {
        const r = poolManager._executeJob(job, cb)
        expect(mocks['async'].retryable.args[0][0]).to.deep.equal({ times: 10, interval: 500 })
      })

      it('should pass async.retryable once with a callback that calls container.executeJob', () => {
        const r = poolManager._executeJob(job, cb)
        mocks['async'].retryable.args[0][1]('fakeNext')
        expect(execJobStub.callCount).to.deep.equal(1)
        expect(execJobStub.args[0][0]).to.deep.equal(job)
        expect(execJobStub.args[0][1]).to.deep.equal('fakeNext')
      })

      it('should pass job.cb once with expected args', () => {
        const result = 'fakeResult'
        const next = sandbox.stub()
        const r = poolManager._executeJob(job, cb)
        mocks['async'].waterfall.args[0][0][1](result, next)
        expect(jobCb.callCount).to.deep.equal(1)
        expect(jobCb.args[0][0]).to.deep.equal(null)
        expect(jobCb.args[0][1]).to.deep.equal(result)
      })

      it('should pass container.cleanup with expected args', () => {
        const result = 'fakeResult'
        const next = sandbox.stub()
        const r = poolManager._executeJob(job, cb)
        mocks['async'].waterfall.args[0][0][1](result, next)
        expect(cleanupStub.callCount).to.deep.equal(1)
        expect(cleanupStub.args[0][0]).to.deep.equal(mocks['lodash'].noop)
      })

      it('should pass next() with expected args', () => {
        const result = 'fakeResult'
        const next = sandbox.stub()
        const r = poolManager._executeJob(job, cb)
        mocks['async'].waterfall.args[0][0][1](result, next)
        expect(next.callCount).to.deep.equal(1)
      })

      it('should pass process.nextTick with expected args', () => {
        const next = sandbox.stub()
        const r = poolManager._executeJob(job, cb)
        mocks['async'].waterfall.args[0][0][2](next)
        expect(poolManager._createContainer.bind.callCount).to.deep.equal(1)
        expect(poolManager._createContainer.bind.args[0][0]).to.deep.equal(poolManager)
        expect(poolManager._createContainer.bind.args[0][1]).to.deep.equal(next)
      })

      it('should pass container.cleanup with expected args', () => {
        const err = 'fakeErr'
        const r = poolManager._executeJob(job, cb)
        mocks['async'].waterfall.args[0][1](err)
        expect(cleanupStub.callCount).to.deep.equal(1)
        expect(cleanupStub.args[0][0]).to.deep.equal(mocks['lodash'].noop)
        expect(cb.callCount).to.deep.equal(1)
        expect(cb.args[0][0]).to.deep.equal(err)
      })

    })

  })


  describe('registerContainer', () => {
    let job, cb, jobCb, shiftStub
    beforeEach(() => {
      jobCb = sandbox.stub()
      job = {
        fake: 'job'
        , cb: jobCb
      }
      cb = sandbox.stub()
      shiftStub = sandbox.stub().returns('shift result')
      poolManager.bootingContainers = [ { not: 'empty1' }, { not: 'empty2' } ]
      poolManager.bootingContainers.splice = sandbox.stub()
      poolManager.waitingJobs = [ { not: 'empty1' }, { not: 'empty2' } ]
      poolManager.waitingJobs.shift = shiftStub
      poolManager._executeJob = sandbox.stub()
    })

    afterEach(() => {

    })

    it('should splice if container is in bootingContainers', () => {
      const indexToUse = 0

      poolManager.registerContainer(poolManager.bootingContainers[indexToUse])
      expect(poolManager.bootingContainers.splice.callCount).to.be.equal(1)
      expect(poolManager.bootingContainers.splice.args[0][0]).to.be.equal(indexToUse)
      expect(poolManager.bootingContainers.splice.args[0][1]).to.be.equal(1)
    })

    it('should not splice otherwise', () => {
      poolManager.registerContainer({ so: 'wrong' })
      expect(poolManager.bootingContainers.splice.callCount).to.be.equal(0)
    })

    it('should shift if waitingJobs is not empty', () => {
      const indexToUse = 0
      poolManager.registerContainer(poolManager.bootingContainers[indexToUse])
      expect(poolManager.waitingJobs.shift.callCount).to.be.equal(1)
    })

    it('should call _executeJob once with expected params if waitingJobs is not empty', () => {
      const indexToUse = 0
      poolManager.registerContainer(poolManager.bootingContainers[indexToUse])
      expect(poolManager._executeJob.callCount).to.be.equal(1)
      expect(poolManager._executeJob.args[0][0]).to.be.equal(shiftStub())
      expect(poolManager._executeJob.args[0][1]).to.be.equal(mocks['lodash'].noop)
    })

    it('should not call any of the above if waitingJobs is empty', () => {
      poolManager.waitingJobs = []
      poolManager.waitingJobs.shift = shiftStub
      poolManager.registerContainer({ so: 'wrong' })
      expect(poolManager.waitingJobs.shift.callCount).to.be.equal(0)
      expect(poolManager._executeJob.callCount).to.be.equal(0)
    })

  })


  describe('cleanup', () => {
    let cb, eachContainerStub, concatStub
    beforeEach(() => {
      cb = sandbox.stub()
      concatStub = sandbox.stub()
      eachContainerStub = { cleanup: { bind: sandbox.stub().resolvesThis(), concat: concatStub } }
      poolManager.bootingContainers = [ eachContainerStub, eachContainerStub ]
      poolManager.bootingContainers.concat = sandbox.stub()
      poolManager.availableContainers = [ eachContainerStub, eachContainerStub ]
      poolManager.availableContainers.concat = sandbox.stub()
    })

    afterEach(() => {

    })

    it('should call bind for each container', () => {
      const expectedCallCount = poolManager.bootingContainers.length + poolManager.availableContainers.length
      poolManager.cleanup(cb)
      expect(eachContainerStub.cleanup.bind.callCount).to.be.equal(expectedCallCount)
      expect(eachContainerStub.cleanup.bind.args[0][0]).to.be.equal(eachContainerStub)
    })

    it('should reset availableContainers', () => {
      poolManager.cleanup(cb)
      expect(poolManager.availableContainers.length).to.be.equal(0)
      expect(poolManager.availableContainers).to.deep.equal([])
    })

    it('should call parallel once', () => {
      const err = 'fakeErr'
      poolManager.cleanup(cb)
      expect(mocks['async'].parallel.callCount).to.be.equal(1)
    })

    it('should pass concated arrays', () => {
      const expectedLength = poolManager.bootingContainers.length + poolManager.availableContainers.length
      poolManager.cleanup(cb)
      expect(mocks['async'].parallel.args[0][0].length).to.be.equal(expectedLength)
    })

    it('should pass provided cb with expected args', () => {
      const err = 'fakeErr'
      poolManager.cleanup(cb)
      mocks['async'].parallel.args[0][1](err)
      expect(cb.callCount).to.be.equal(1)
      expect(cb.args[0][0]).to.be.equal(err)
    })

    it('should pass noop cb, if none provided, with expected args', () => {
      const err = 'fakeErr'
      poolManager.cleanup()
      mocks['async'].parallel.args[0][1](err)
      expect(mocks['lodash'].noop.callCount).to.be.equal(1)
      expect(mocks['lodash'].noop.args[0][0]).to.be.equal(err)
    })

  })


})