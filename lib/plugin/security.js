"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getPermissions = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _utils = require("./utils");

var _error = require("../error");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var ALL = "ALL";
var ADMIN = "ADMIN";
var ADMIN_READ = "ADMIN_READ";

var getPermissions = exports.getPermissions = function getPermissions(security, user, action) {

    if (!user) return true;

    var projectionToObject = function projectionToObject(projection) {
        if ((typeof projection === "undefined" ? "undefined" : _typeof(projection)) === "object") return projection;
        return projection.split(" ").reduce(function (prev, field) {
            var excluding = field.startsWith("-");
            if (excluding) field = field.replace("-", "");
            return _extends({}, prev, _defineProperty({}, field, excluding ? 0 : 1));
        }, {});
    };

    return user.roles.reduce(function (prevPermission, role) {

        if (prevPermission === true || role === ADMIN && !security.ADMIN && !security.ALL || action === "read" && role === ADMIN_READ && !security.ADMIN_READ && !security.ALL) {
            return true;
        }

        if (!security) return false;

        var rolePermissions = security[role] || security[ALL] || {};
        var permission = rolePermissions[action];
        if (permission === true) {
            return true;
        }

        if (!permission) {
            return prevPermission;
        }

        if ((typeof rolePermissions === "undefined" ? "undefined" : _typeof(rolePermissions)) !== "object") {
            return prevPermission;
        }

        var where = void 0;
        if (permission.where) {
            where = prevPermission.where || [];
            where.push(permission.where(user));
        }
        var prevProj = prevPermission.projection && projectionToObject(prevPermission.projection) || {};
        var curProj = permission.projection && projectionToObject(permission.projection) || {};

        return { where: where, projection: _extends({}, prevProj, curProj) };
    }, false);
};

var securityPlugin = function securityPlugin(schema) {
    var onUpdate = function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(_ref5) {
            var _this2 = this;

            var where = _ref5.where,
                projection = _ref5.projection;
            return regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            where && this.or.apply(this, _toConsumableArray(where));

                            if (projection) {
                                _context2.next = 3;
                                break;
                            }

                            return _context2.abrupt("return");

                        case 3:
                            this._update = normalizeSet(this._update);
                            handleRestricted(this._update, projection, function (path) {
                                return delete _this2._update[path];
                            });

                        case 5:
                        case "end":
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        return function onUpdate(_x) {
            return _ref6.apply(this, arguments);
        };
    }();

    schema.methods.setOptions = function (options) {
        this._options = options;
        return this;
    };

    var security = schema.options.security;


    var createSecurityHandler = function createSecurityHandler(action, callback) {
        return function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                var _ref2, user, permissions;

                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _ref2 = this.constructor.name === "Query" && this.options || this.constructor.name === "model" && this._options || {}, user = _ref2.user;
                                permissions = getPermissions(security, user, action);
                                // Throwing error does not stop execution chain while saving.
                                // Promise rejecting works in all cases.

                                if (permissions) {
                                    _context.next = 4;
                                    break;
                                }

                                return _context.abrupt("return", Promise.reject(new _error.AccessDeniedError()));

                            case 4:
                                _context.next = 6;
                                return callback.call(this, permissions);

                            case 6:
                            case "end":
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function querySecurityHandler() {
                return _ref.apply(this, arguments);
            }

            return querySecurityHandler;
        }();
    };

    var normalizeSet = function normalizeSet(object) {
        var result = {};
        (0, _utils.eachPathRecursive)(schema, function (path) {
            // Reducing path to first array
            path = path.split(".").reduce(function (prev, cur) {
                var isArray = Array.isArray(_lodash2.default.get(object, prev));
                return isArray ? prev : prev + "." + cur;
            });
            var value = _lodash2.default.get(object, path);
            if (value) result[path] = value;
        });
        return result;
    };

    var handleRestricted = function handleRestricted(object, projection, handler) {
        var exclusive = projection[Object.keys(projection)[0]] === 0;
        var excludeFilter = function excludeFilter(path) {
            return exclusive && projection[path] === 0 || !exclusive && !projection[path];
        };
        Object.keys(object).filter(excludeFilter).forEach(function (path) {
            return handler(path);
        });
    };

    function onSave(_ref3) {
        var _this = this;

        var projection = _ref3.projection;

        if (!projection) return;
        var normalizedDoc = normalizeSet(this._doc);
        handleRestricted(normalizedDoc, projection, function (path) {
            return _this.set(path, undefined);
        });
    }

    function onRead(_ref4) {
        var where = _ref4.where,
            projection = _ref4.projection;

        where && this.or.apply(this, _toConsumableArray(where));
        projection && this.select(projection);
    }

    schema.pre("save", createSecurityHandler("create", onSave));
    schema.pre("find", createSecurityHandler("read", onRead));
    schema.pre("findOne", createSecurityHandler("read", onRead));
    schema.pre("findOneAndUpdate", createSecurityHandler("update", onUpdate));
    schema.pre("findOneAndRemove", createSecurityHandler("delete", onRead));
    schema.pre("findOneAndDelete", createSecurityHandler("delete", onRead));
};

exports.default = securityPlugin;
//# sourceMappingURL=security.js.map