module.exports = process.env.BACKDULAKE_COVERAGE
  ? require('./lib-cov/Backdulake')
  : require('./lib/Backdulake')
