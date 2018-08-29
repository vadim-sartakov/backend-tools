const { defaults } = require('jest-config');

const config = {
    testMatch: [ ...defaults.testMatch, /.+(\.itest)\.js/ ]
};

module.exports = config;