"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.unauthorized = exports.validator = exports.security = exports.internalError = exports.notFound = exports.commonMiddlewares = undefined;

var _helmet = require("helmet");

var _helmet2 = _interopRequireDefault(_helmet);

var _cookieParser = require("cookie-parser");

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require("body-parser");

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _sharedTools = require("shared-tools");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var commonMiddlewares = exports.commonMiddlewares = [(0, _helmet2.default)(), (0, _cookieParser2.default)(), _bodyParser2.default.urlencoded({ extended: true }), _bodyParser2.default.json()];

var notFound = exports.notFound = function notFound() {
    var debug = (0, _debug2.default)("middleware:notFound");
    return function (req, res) {
        debug("%s requested non-existed resource %s", req.ip, req.originalUrl);
        res.status(404).send({ message: "Not found" });
    };
};

var internalError = exports.internalError = function internalError() {
    var debug = (0, _debug2.default)("middleware:internalError");
    return function (err, req, res, next) {
        // eslint-disable-line no-unused-vars
        debug("%s\n%s", err.message, err.stack);
        res.status(500).send({ message: "Internal server error" });
    };
};

/**
 * Checks current user sotred in "user.local" against security schema.
 * Resulted filter stored in "res.locals.permissions" parameter
 * @param {Object} schema
 */
var security = exports.security = function security(schema, logger) {
    return function (req, res, next) {
        var user = res.locals.user;

        var permissions = (0, _sharedTools.getPermissions)(user, schema, "create", "read", "update", "delete");
        var method = req.method;

        if (method === "POST" && !permissions.create || method === "GET" && !permissions.read || method === "PUT" && !permissions.update || method === "DELETE" && !permissions.delete) {
            res.status(403);
            res.json({ message: "Access is denied" });
            logger && logger.warn("Access denied for %s to %s", req.ip, req.originalUrl);
            return;
        }
        res.locals.permissions = permissions;
        next();
    };
};

var validator = exports.validator = function validator(constraints) {
    return function (req, res, next) {
        var errors = (0, _sharedTools.validate)(req.body, constraints);
        if (errors) {
            res.status(400);
            return res.json({ message: "Validation failed", errors: errors });
        }
        next();
    };
};

var unauthorized = exports.unauthorized = function unauthorized() {
    var debug = (0, _debug2.default)("middleware:unauthorized");
    return function (req, res, next) {
        if (res.locals.user) return next();
        debug("Unauthorized access from %s to %s", req.ip, req.originalUrl);
        res.status(401);
        res.json({ message: "Unathorized" });
    };
};
//# sourceMappingURL=middleware.js.map