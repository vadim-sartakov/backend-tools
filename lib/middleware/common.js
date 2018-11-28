'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _helmet = require('helmet');

var _helmet2 = _interopRequireDefault(_helmet);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = [(0, _helmet2.default)(), (0, _cookieParser2.default)(), _bodyParser2.default.urlencoded({ extended: true }), _bodyParser2.default.json()];
//# sourceMappingURL=common.js.map