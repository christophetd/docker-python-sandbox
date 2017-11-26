const generateMocks = sandbox => {
  return {
    'lodash': {
      noop: sandbox.stub().returns('noop result')
    }
  }
}

module.exports = generateMocks