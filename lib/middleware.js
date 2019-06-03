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

var _utils = require("./utils");

var _commonTools = require("common-tools");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

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
 * Checks current user stored in "user.local" against security schema.
 * Resulted filter stored in "res.locals.permissions" parameter
 * @param {Object} schema
 */
var security = exports.security = function security(schema) {
  for (var _len = arguments.length, modifiers = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    modifiers[_key - 1] = arguments[_key];
  }

  var debug = (0, _debug2.default)("middleware:security");
  return function (req, res, next) {
    var user = res.locals.user;

    var permissions = _commonTools.getPermissions.apply(undefined, [user, schema].concat(modifiers));
    var denied = modifiers.some(function (modifier) {
      return !permissions[modifier];
    });
    if (denied) {
      res.status(403);
      res.json({ message: "Access is denied" });
      debug("Access denied for %s to %s", req.ip, req.originalUrl);
      return;
    }
    res.locals.permissions = permissions;
    next();
  };
};

var validator = exports.validator = function validator(constraints) {
  var debug = (0, _debug2.default)("middleware:validator");
  return (0, _utils.asyncMiddleware)(function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(req, res, next) {
      var errors;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return (0, _commonTools.validate)(req.body, constraints);

            case 2:
              errors = _context.sent;

              if (!errors) {
                _context.next = 7;
                break;
              }

              debug("Validation failed. Url: %s; payload: %o; errors: %o", req.originalUrl, req.body, errors);
              res.status(400);
              return _context.abrupt("return", res.json({ message: "Validation failed", errors: errors }));

            case 7:
              next();

            case 8:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function (_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }());
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