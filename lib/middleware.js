'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.securityFilter = exports.internalError = exports.notFound = exports.common = undefined;

var _helmet = require('helmet');

var _helmet2 = _interopRequireDefault(_helmet);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _sharedTools = require('shared-tools');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var common = exports.common = [(0, _helmet2.default)(), (0, _cookieParser2.default)(), _bodyParser2.default.urlencoded({ extended: true }), _bodyParser2.default.json()];

var notFound = exports.notFound = function notFound(logger) {
    return function (req, res) {
        logger && logger.warn("%s requested non-existed resource %s", req.ip, req.originalUrl);
        res.status(404).send({ message: "Not found" });
    };
};

var internalError = exports.internalError = function internalError(logger) {
    return function (err, req, res, next) {
        // eslint-disable-line no-unused-vars
        logger && logger.error("%s\n%s", err.message, err.stack);
        res.status(500).send({ message: "Internal server error" });
    };
};

/**
 * Checks current user sotred in "user.local" against security schema.
 * Resulted filter stored in "res.locals.security" parameter
 * @param {Object} securitySchema
 */
var securityFilter = exports.securityFilter = function securityFilter(securitySchema) {
    for (var _len = arguments.length, accessModifiers = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        accessModifiers[_key - 1] = arguments[_key];
    }

    return function (req, res, next) {
        var user = res.locals.user;

        var security = _sharedTools.getPermissions.apply(undefined, [user, securitySchema].concat(accessModifiers));
        res.locals.security = security;
        next();
    };
};
//# sourceMappingURL=middleware.js.map