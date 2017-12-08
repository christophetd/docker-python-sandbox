"use strict";

const expect = require('chai').expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const generateMocks = require('../../helpers/ContainerMocks')

describe('Container', () => {
  let mocks
  let Container
  let container
  let sandbox
  let id
  let instance

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    mocks = generateMocks(sandbox)
    id = '123'
    instance = {
      stop: sandbox.stub()
      , remove: sandbox.stub()
    }
    Container = proxyquire('../../../lib/Container', mocks)
    container = new Container(id, instance)
  })


  afterEach(() => {
    sandbox.restore()
    mocks = null
    Container = null
    container = null
  })


  it('should pass expected items to constructor', () => {
    const expected = {
      id: id
      , instance: instance
      , ip: ""
      , cleanedUp: false
    }

    expect(container).to.deep.equal(expected)
  })

  describe('setIp', () => {
    let ip

    beforeEach(() => {
      ip = 'fakeIp'
    })

    afterEach(() => {
      ip = null
    })

    it('should change ip from blank to provided', () => {
      expect(container.ip).to.deep.equal('')
      const r = container.setIp(ip)
      expect(container.ip).to.deep.equal(ip)
    })

  })

  describe('executeJob', () => {
    let job, cb

    beforeEach(() => {
      job = {
        code: 'fakecode'
        , timeoutMs: 1111
        , v3: false
      }
      cb = sandbox.stub()
    })

    afterEach(() => {
      job = null
      cb = null
    })

    it('should call request.post using this.ip by default', () => {
      const r = container.executeJob(job, cb)
      expect(mocks['request'].post.args[0][0].url).to.deep.equal('http://:3000/')
    })

    it('should call request.post once with expected args', () => {
      const expected = {
        url: 'http://:3000/',
        json: true,
        body: job,
        timeout: job.timeoutMs + 500
      }
      const r = container.executeJob(job, cb)
      expect(mocks['request'].post.callCount).to.equal(1)
      expect(mocks['request'].post.args[0][0]).to.deep.equal(expected)
    })

    it('should call cb once with expected params if an err with the code ETIMEDOUT is returned to the request.post callback', () => {
      mocks['request'].post.callsArgWith(1, { code: "ETIMEDOUT" }, null)
      const expected = {
        timedOut: true,
        isError: true,
        stderr: '',
        stdout: '',
        combined: ''
      }
      const r = container.executeJob(job, cb)
      expect(cb.callCount).to.equal(1)
      expect(cb.args[0][0]).to.equal(null)
      expect(cb.args[0][1]).to.deep.equal(expected)
    })

    it('should call cb once with expected params if an err with any other code is returned to the request.post callback', () => {
      mocks['request'].post.callsArgWith(1, { code: "SOMETHINGELSE" }, null)
      const r = container.executeJob(job, cb)
      expect(cb.callCount).to.equal(1)
      expect(cb.args[0][0].toString()).to.equal('Error: unable to contact container: [object Object]')
    })

    it('should call cb once with expected params if no err but no res object either', () => {
      mocks['request'].post.callsArgWith(1, null, null)
      const r = container.executeJob(job, cb)
      expect(cb.callCount).to.equal(1)
      expect(cb.args[0][0].toString()).to.equal('Error: empty response from container')
    })


    it('should call cb once with expected params by default (killedByContainer = undefined)', () => {
      const response = {
        body: {
          isError: false,
          timedOut: false,
          stderr: 'fakeStdErr',
          stdout: 'fakeStdOut',
          combined: 'fakeCombined',
          killedByContainer: undefined
        }
      }

      const expected = response.body
      expected.killedByContainer = false // should convert undefined to false

      mocks['request'].post.callsArgWith(1, null, response)
      const r = container.executeJob(job, cb)
      expect(cb.callCount).to.equal(1)
      expect(cb.args[0][0]).to.deep.equal(null)
      expect(cb.args[0][1]).to.deep.equal(expected)
    })

    it('should call cb once with expected params by default (killedByContainer = true)', () => {
      const response = {
        body: {
          isError: false,
          timedOut: false,
          stderr: 'fakeStdErr',
          stdout: 'fakeStdOut',
          combined: 'fakeCombined',
          killedByContainer: true
        }
      }

      const expected = response.body
      mocks['request'].post.callsArgWith(1, null, response)
      const r = container.executeJob(job, cb)
      expect(cb.callCount).to.equal(1)
      expect(cb.args[0][0]).to.deep.equal(null)
      expect(cb.args[0][1]).to.deep.equal(expected)
    })

  })

  describe('cleanup', () => {
    let cb

    beforeEach(() => {
      cb = sandbox.stub()
      container.instance.stop.bind = sandbox.stub()
      container.instance.remove.bind = sandbox.stub()
    })

    afterEach(() => {
      cb = null
    })

    it('should call async.nextTick once with expected args if container.cleanedUp === true', () => {
      const r = container.cleanup(cb)
      expect(mocks['async'].nextTick.callCount).to.deep.equal(0)
      container.cleanedUp = true
      const rV2 = container.cleanup(cb)
      expect(mocks['async'].nextTick.callCount).to.deep.equal(1)
      expect(mocks['async'].nextTick.args[0][0]).to.deep.equal(cb)
    })

    it('should call async.series once with expected args if container.cleanedUp === false', () => {
      const r = container.cleanup(cb)
      // call to async.series
      expect(mocks['async'].series.callCount).to.deep.equal(1)
    })

    it('should call async.series with instance.stop.bind()', () => {
      const r = container.cleanup(cb)

      expect(container.instance.stop.bind.callCount).to.deep.equal(1)
      expect(container.instance.stop.bind.args[0][0]).to.deep.equal(container.instance)
    })

    it('should call async.series with instance.remove.bind()', () => {
      const r = container.cleanup(cb)
      // call to async.series

      expect(container.instance.remove.bind.callCount).to.deep.equal(1)
      expect(container.instance.remove.bind.args[0][0]).to.deep.equal(container.instance)
      expect(container.instance.remove.bind.args[0][1]).to.deep.equal({ force: true })
    })

    it('should call async.series with expected next function', () => {
      const r = container.cleanup(cb)

      // async.nextTick and cleanedUp should not be called and should be false to begin with
      expect(mocks['async'].nextTick.callCount).to.equal(0)
      expect(container.cleanedUp).to.be.equal(false)

      // async.nextTick and cleanedUp should be called if the
      // third param in the first arg of async.series is called
      mocks['async'].series.args[0][0][2]()
      expect(container.cleanedUp).to.be.equal(true)
      expect(mocks['async'].nextTick.callCount).to.equal(1)
    })


  })

})
