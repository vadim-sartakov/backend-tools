"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _express = require("express");

var _querystring = require("querystring");

var _querystring2 = _interopRequireDefault(_querystring);

var _httpLinkHeader = require("http-link-header");

var _httpLinkHeader2 = _interopRequireDefault(_httpLinkHeader);

var _http = require("../utils/http");

var _middleware = require("../middleware");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var defaultOptions = {
    defaultPageSize: 20
};

var createMiddlewareChain = function createMiddlewareChain(createMiddleware, Model, crudOptions, securitySchema, validationSchema) {
    var crudMiddleware = createMiddleware(Model, crudOptions);
    var chain = [];
    if (securitySchema) chain.push((0, _middleware.security)(securitySchema));
    if (validationSchema) chain.push((0, _middleware.validator)(validationSchema));
    chain.push(crudMiddleware);
    return chain;
};

var crudRouter = function crudRouter(Model, options) {
    options = _extends({}, defaultOptions, options);
    var router = (0, _express.Router)();
    var rootRouter = router.route("/");

    var _options = options,
        securitySchema = _options.securitySchema,
        validationSchema = _options.validationSchema,
        crudOptions = _objectWithoutProperties(_options, ["securitySchema", "validationSchema"]);

    !options.disableGetAll && rootRouter.get(createMiddlewareChain(createGetAll, Model, crudOptions, securitySchema));
    !options.disableAddOne && rootRouter.post(createMiddlewareChain(createAddOne, Model, crudOptions, securitySchema, validationSchema));
    var idRouter = router.route("/:id");
    !options.disableGetOne && idRouter.get(createMiddlewareChain(createGetOne, Model, crudOptions, securitySchema));
    !options.disableUpdateOne && idRouter.put(createMiddlewareChain(createUpdateOne, Model, crudOptions, securitySchema, validationSchema));
    !options.disableDeleteOne && idRouter.delete(createMiddlewareChain(createDeleteOne, Model, crudOptions, securitySchema));
    return router;
};

var createGetAll = function createGetAll(Model, options) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(req, res) {
            var defaultPageSize, permissions, _req$query, page, size, filter, sort, result, totalCount, lastPage, prev, nextPage, link;

            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            defaultPageSize = options.defaultPageSize;
                            permissions = res.locals.permissions;
                            _req$query = req.query, page = _req$query.page, size = _req$query.size, filter = _req$query.filter, sort = _req$query.sort;
                            // Converting to number by multiplying by 1

                            page = page && page * 1 || 0;
                            size = size && size * 1 || defaultPageSize;

                            _context.next = 7;
                            return Model.getAll({ page: page, size: size, filter: filter, sort: sort }, permissions);

                        case 7:
                            result = _context.sent;
                            _context.next = 10;
                            return Model.count(filter, undefined);

                        case 10:
                            totalCount = _context.sent;
                            lastPage = Math.max(Math.ceil(totalCount / size) - 1, 0);
                            prev = Math.max(page - 1, 0);
                            nextPage = Math.min(page + 1, totalCount, lastPage);
                            link = new _httpLinkHeader2.default();

                            link.set({ uri: (0, _http.getCurrentUrl)(req) + "?" + _querystring2.default.stringify({ page: 0, size: size }), rel: "first" });
                            page > 0 && link.set({ uri: (0, _http.getCurrentUrl)(req) + "?" + _querystring2.default.stringify({ page: prev, size: size }), rel: "previous" });
                            page < lastPage && link.set({ uri: (0, _http.getCurrentUrl)(req) + "?" + _querystring2.default.stringify({ page: nextPage, size: size }), rel: "next" });
                            link.set({ uri: (0, _http.getCurrentUrl)(req) + "?" + _querystring2.default.stringify({ page: lastPage, size: size }), rel: "last" });

                            res.set("X-Total-Count", totalCount);
                            res.set("Link", link.toString());
                            res.json(result);

                        case 22:
                        case "end":
                            return _context.stop();
                    }
                }
            }, _callee, undefined);
        }));

        return function (_x, _x2) {
            return _ref.apply(this, arguments);
        };
    }());
};

var getLocation = function getLocation(req, id) {
    return (0, _http.getCurrentUrl)(req) + "/" + id;
};

var createAddOne = function createAddOne(Model) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(req, res) {
            var permissions, instance, id;
            return regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            permissions = res.locals.permissions;
                            _context2.next = 3;
                            return Model.addOne(req.body, permissions);

                        case 3:
                            instance = _context2.sent;
                            id = instance._id || instance.id;
                            _context2.next = 7;
                            return Model.getOne({ id: id }, permissions);

                        case 7:
                            instance = _context2.sent;

                            res.status(201).location(getLocation(req, instance._id || instance.id)).json(instance);

                        case 9:
                        case "end":
                            return _context2.stop();
                    }
                }
            }, _callee2, undefined);
        }));

        return function (_x3, _x4) {
            return _ref2.apply(this, arguments);
        };
    }());
};

var createGetOne = function createGetOne(Model) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(req, res, next) {
            var permissions, instance;
            return regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            permissions = res.locals.permissions;
                            _context3.next = 3;
                            return Model.getOne({ id: req.params.id }, permissions);

                        case 3:
                            instance = _context3.sent;

                            instance ? res.json(instance) : next();

                        case 5:
                        case "end":
                            return _context3.stop();
                    }
                }
            }, _callee3, undefined);
        }));

        return function (_x5, _x6, _x7) {
            return _ref3.apply(this, arguments);
        };
    }());
};

var returnInstanceOrContinue = function () {
    var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(Model, instance, req, res, next) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        if (!instance) {
                            _context4.next = 7;
                            break;
                        }

                        _context4.next = 3;
                        return Model.getOne({ id: req.params.id }, res.locals.permissions);

                    case 3:
                        instance = _context4.sent;

                        res.json(instance);
                        _context4.next = 8;
                        break;

                    case 7:
                        next();

                    case 8:
                    case "end":
                        return _context4.stop();
                }
            }
        }, _callee4, undefined);
    }));

    return function returnInstanceOrContinue(_x8, _x9, _x10, _x11, _x12) {
        return _ref4.apply(this, arguments);
    };
}();

var createUpdateOne = function createUpdateOne(Model) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(req, res, next) {
            var permissions, instance;
            return regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            permissions = res.locals.permissions;
                            _context5.next = 3;
                            return Model.updateOne({ id: req.params.id }, req.body, permissions);

                        case 3:
                            instance = _context5.sent;
                            _context5.next = 6;
                            return returnInstanceOrContinue(Model, instance, req, res, next);

                        case 6:
                        case "end":
                            return _context5.stop();
                    }
                }
            }, _callee5, undefined);
        }));

        return function (_x13, _x14, _x15) {
            return _ref5.apply(this, arguments);
        };
    }());
};

var createDeleteOne = function createDeleteOne(Model) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(req, res, next) {
            var permissions, instance;
            return regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            permissions = res.locals.permissions;
                            _context6.next = 3;
                            return Model.deleteOne({ id: req.params.id }, permissions);

                        case 3:
                            instance = _context6.sent;
                            _context6.next = 6;
                            return returnInstanceOrContinue(Model, instance, req, res, next);

                        case 6:
                        case "end":
                            return _context6.stop();
                    }
                }
            }, _callee6, undefined);
        }));

        return function (_x16, _x17, _x18) {
            return _ref6.apply(this, arguments);
        };
    }());
};

exports.default = crudRouter;
//# sourceMappingURL=crud.js.map