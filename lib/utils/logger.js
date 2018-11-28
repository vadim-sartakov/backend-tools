'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createLogger = exports.logDirectory = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logDirectory = exports.logDirectory = process.env.LOG_PATH || "./log";

var createLogger = exports.createLogger = function createLogger(labelName) {

    if (!_fs2.default.existsSync(logDirectory)) {
        _fs2.default.mkdirSync(logDirectory);
    }

    var _winston$format = _winston2.default.format,
        combine = _winston$format.combine,
        label = _winston$format.label,
        colorize = _winston$format.colorize,
        timestamp = _winston$format.timestamp,
        splat = _winston$format.splat,
        printf = _winston$format.printf;

    var custom = printf(function (info) {
        return info.timestamp + ' ' + info.level + ' [' + info.label + ']: ' + info.message;
    });

    var format = combine(label({ label: labelName }), timestamp(), splat(), custom);
    var transports = [new _winston2.default.transports.Console({
        format: combine(colorize(), format)
    })];

    var FileTransport = new _winston2.default.transports.File({
        filename: logDirectory + '/app.log',
        maxsize: 1024 * 1024 * 10,
        maxFiles: 10,
        format: format
    });
    transports.push(FileTransport);

    var debug = (0, _debug2.default)(labelName);
    var logger = _winston2.default.createLogger({
        level: debug.enabled && "debug" || "info",
        transports: transports
    });

    return logger;
};

exports.default = createLogger;
//# sourceMappingURL=logger.js.map