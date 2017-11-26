const generateMocks = sandbox => {
  const postStub = sandbox.stub()
  postStub.callsArgWith(1, null, 'request.post result')
  postStub.withArgs('shouldReturnErrTimedOut').callsArgWith(1, { code: "ETIMEDOUT" }, null)
  return {
    'lodash': {
      noop: sandbox.stub().returns('noop result')
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
    }
  }
}

module.exports = generateMocks