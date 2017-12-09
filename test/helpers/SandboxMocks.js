const _ = require('lodash')

const generateMocks = sandbox => {
  const postStub = sandbox.stub()
  postStub.callsArgWith(1, null, 'request.post result')
  postStub.withArgs('shouldReturnErrTimedOut').callsArgWith(1, { code: "ETIMEDOUT" }, null)
  return {
    './Job': sandbox.stub().returns('new job'),
    './Container': sandbox.stub().returns('new container'),
    './PoolManager': sandbox.stub().returns('new PoolManager'),
    'lodash': {
      noop: sandbox.stub().returns('noop result')
      , range: (p) => { return _.range(p) }
      , isEmpty: (p) => { return _.isEmpty(p) }
      , delay: sandbox.stub()
      , partial: sandbox.stub()
      , defaults: (p1, p2) => { return _.defaults(p1, p2) }
      , isObject: (options) => { return _.isObject(options) }
      , isString: (options) => { return _.isString(options) }
    },
    'request': {
      post: sandbox.stub()
    },
    'yargs': {
      argv: {
        mac: ""
      }
    },
    'async': {
      nextTick: sandbox.stub()
      , series: sandbox.stub()
      , parallel: sandbox.stub()
      , waterfall: sandbox.stub().resolvesThis()
      , retryable: sandbox.stub()
    },
    'events': {
      EventEmitter: sandbox.stub().returns('hi')
    },
    'uuid': {
      v4: sandbox.stub()
    },
    'dockerode': sandbox.stub().resolves('new dockerode'),
  }
}

module.exports = generateMocks