module.exports = function (wallaby) {
  return {
    files: [
      'lib/**.js',
      'container/**.js',
      'test/helpers/*.js'
    ],
    tests: [
      'test/unit/**/*Test.js'
    ],
    env: {
      type: 'node',
      runner: 'node'  // or full path to any node executable
    },
    compilers: {
      '**/*.js': wallaby.compilers.babel()
    },
    testFramework: 'mocha'
  }
}