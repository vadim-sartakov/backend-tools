"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _accessDenied = require("../error/accessDenied");

var _accessDenied2 = _interopRequireDefault(_accessDenied);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var securityMiddleware = function securityMiddleware(req, res, next) {
    var permitted = res.locals.permitted;

    if (!permitted) throw new _accessDenied2.default();
    next();
};

exports.default = securityMiddleware;
//# sourceMappingURL=security.js.map