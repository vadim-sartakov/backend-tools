'use strict';

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var env = process.env.NODE_ENV;
_dotenv2.default.config({ path: './' + (env === "test" ? ".test" : "") + '.env' });
// Force debug parameter parsing as it was read from file.
_debug2.default.enable(process.env.DEBUG);
//# sourceMappingURL=env.js.map