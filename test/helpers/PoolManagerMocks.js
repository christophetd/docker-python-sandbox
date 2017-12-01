const _ = require('lodash')

const generateMocks = sandbox => {
  const postStub = sandbox.stub()
  postStub.callsArgWith(1, null, 'request.post result')
  postStub.withArgs('shouldReturnErrTimedOut').callsArgWith(1, { code: "ETIMEDOUT" }, null)
  return {
    './Container': sandbox.stub().returns('new container'),
    'lodash': {
      noop: sandbox.stub().returns('noop result')
      , range: (p) => { return _.range(p) }
      , isEmpty: (p) => { return _.isEmpty(p) }
      , delay: sandbox.stub()
      , partial: sandbox.stub()
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
    }
  }
}

module.exports = generateMocks