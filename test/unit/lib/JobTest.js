"use strict";

const expect = require('chai').expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const generateMocks = require('../../helpers/JobMocks')

describe('Job', () => {
  let mocks
  let Job
  let job
  let sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    mocks = generateMocks(sandbox)
    Job = proxyquire('../../../lib/Job', mocks)
    job = new Job()
  })


  afterEach(() => {
    sandbox.restore()
    mocks = null
    Job = null
    job = null
  })


  it('should pass expected items to constructor', () => {
    const code = 'fakeCode'
      , timeoutMs = '20000000'
      , cb = () => { return 'hiya' }
      , v3 = 'does not matter'

    job = new Job(code, timeoutMs, cb, v3)

    expect(job).to.deep.equal({ code, timeoutMs, cb, v3 })
  })

  it('should use passed cb if provided', () => {
    const code = 'fakeCode'
      , timeoutMs = '20000000'
      , cb = () => { return 'hiya' }
      , v3 = 'does not matter'

    job = new Job(code, timeoutMs, cb, v3)

    expect(job.cb()).to.deep.equal(cb())
  })

  it('should default to noop if no cb provided', () => {
    const code = 'fakeCode'
      , timeoutMs = '20000000'
      , cb = null
      , v3 = 'does not matter'

    job = new Job(code, timeoutMs, cb, v3)

    expect(job.cb()).to.deep.equal(mocks['lodash'].noop())
  })
})
