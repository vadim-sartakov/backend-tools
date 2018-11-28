"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createDeleteOne = exports.createUpdateOne = exports.createGetOne = exports.getLocation = exports.createAddOne = exports.createGetAll = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _express = require("express");

var _querystring = require("querystring");

var _querystring2 = _interopRequireDefault(_querystring);

var _httpLinkHeader = require("http-link-header");

var _httpLinkHeader2 = _interopRequireDefault(_httpLinkHeader);

var _http = require("../utils/http");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var crudRouter = function crudRouter(Model, opts) {

    var router = (0, _express.Router)();
    var routeMap = createRouteMap(Model, opts);

    var rootRouter = router.route("/");
    routeMap.getAll && rootRouter.get(routeMap.getAll);
    routeMap.addOne && rootRouter.post(routeMap.addOne);

    var idRouter = router.route("/:id");
    routeMap.getOne && idRouter.get(routeMap.getOne);
    routeMap.updateOne && idRouter.put(routeMap.updateOne);
    routeMap.deleteOne && idRouter.delete(routeMap.deleteOne);

    return router;
};

var defaultOpts = {
    defaultPageSize: 20,
    delimiter: ","
};

var createRouteMap = function createRouteMap(Model) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultOpts;


    var routeMap = {
        getAll: createGetAll(Model, opts),
        addOne: createAddOne(Model, opts),
        getOne: createGetOne(Model, opts),
        updateOne: createUpdateOne(Model, opts),
        deleteOne: createDeleteOne(Model, opts)
    };

    return routeMap;
};

var errorHandler = function errorHandler(err, res, next) {
    if (err.name !== "ValidationError") return next(err);
    res.status(400).json(err);
};

var createGetAll = exports.createGetAll = function createGetAll(Model) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultOpts;
    return (0, _http.asyncMiddleware)(function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(req, res) {
            var _opts, defaultPageSize, _res$locals, user, i18n, _req$query, page, size, filter, sort, query, result, countQuery, totalCount, lastPage, prev, nextPage, link;

            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:

                            opts = _extends({}, defaultOpts, opts);

                            _opts = opts, defaultPageSize = _opts.defaultPageSize;
                            _res$locals = res.locals, user = _res$locals.user, i18n = _res$locals.i18n;
                            _req$query = req.query, page = _req$query.page, size = _req$query.size, filter = _req$query.filter, sort = _req$query.sort;

                            page = page && page * 1 || 0;
                            size = size && size * 1 || defaultPageSize;

                            query = Model.find().setOptions({ i18n: i18n, user: user }).skip(page * size).limit(size);


                            if (filter) query.where(filter);
                            if (sort) query.sort(sort);

                            _context.next = 11;
                            return query.exec();

                        case 11:
                            result = _context.sent;
                            countQuery = Model.count().setOptions({ i18n: i18n, user: user });

                            if (filter) countQuery.where(filter);

                            _context.next = 16;
                            return countQuery.exec();

                        case 16:
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

                        case 28:
                        case "end":
                            return _context.stop();
                    }
                }
            }, _callee, undefined);
        }));

        return function (_x3, _x4) {
            return _ref.apply(this, arguments);
        };
    }(), function (err, req, res, next) {
        return errorHandler(err, res, next);
    });
};

var createAddOne = exports.createAddOne = function createAddOne(Model) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(req, res) {
            var _res$locals2, user, i18n, doc, instance, created;

            return regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            _res$locals2 = res.locals, user = _res$locals2.user, i18n = _res$locals2.i18n;
                            doc = new Model(req.body);


                            doc.setOptions && doc.setOptions({ user: user, i18n: i18n });

                            _context2.next = 5;
                            return doc.save();

                        case 5:
                            instance = _context2.sent;
                            _context2.next = 8;
                            return Model.findById(instance._id).setOptions({ user: user, i18n: i18n });

                        case 8:
                            created = _context2.sent;


                            res.status(201).location(getLocation(req, created._id)).json(created.toObject());

                        case 10:
                        case "end":
                            return _context2.stop();
                    }
                }
            }, _callee2, undefined);
        }));

        return function (_x5, _x6) {
            return _ref2.apply(this, arguments);
        };
    }(), function (err, req, res, next) {
        return errorHandler(err, res, next);
    });
};

var getLocation = exports.getLocation = function getLocation(req, id) {
    return (0, _http.getCurrentUrl)(req) + "/" + id;
};

var createGetOne = exports.createGetOne = function createGetOne(Model) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(req, res, next) {
            var _res$locals3, user, i18n, instance;

            return regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            _res$locals3 = res.locals, user = _res$locals3.user, i18n = _res$locals3.i18n;
                            _context3.next = 3;
                            return Model.findOne({ _id: req.params.id }).setOptions({ user: user, i18n: i18n });

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

        return function (_x7, _x8, _x9) {
            return _ref3.apply(this, arguments);
        };
    }(), function (err, req, res, next) {
        return errorHandler(err, res, next);
    });
};

var createUpdateOne = exports.createUpdateOne = function createUpdateOne(Model) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(req, res, next) {
            var _res$locals4, user, i18n, instance, updatedInstance;

            return regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            _res$locals4 = res.locals, user = _res$locals4.user, i18n = _res$locals4.i18n;
                            _context4.next = 3;
                            return Model.findOneAndUpdate({ _id: req.params.id }, req.body, { runValidators: true, context: 'query', i18n: i18n, user: user });

                        case 3:
                            instance = _context4.sent;

                            if (instance) {
                                _context4.next = 6;
                                break;
                            }

                            return _context4.abrupt("return", next());

                        case 6:
                            _context4.next = 8;
                            return Model.findById(instance._id).setOptions({ user: user, i18n: i18n });

                        case 8:
                            updatedInstance = _context4.sent;

                            updatedInstance && res.json(updatedInstance);

                        case 10:
                        case "end":
                            return _context4.stop();
                    }
                }
            }, _callee4, undefined);
        }));

        return function (_x10, _x11, _x12) {
            return _ref4.apply(this, arguments);
        };
    }(), function (err, req, res, next) {
        return errorHandler(err, res, next);
    });
};

var createDeleteOne = exports.createDeleteOne = function createDeleteOne(Model) {
    return (0, _http.asyncMiddleware)(function () {
        var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(req, res, next) {
            var _res$locals5, user, i18n, instance;

            return regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            _res$locals5 = res.locals, user = _res$locals5.user, i18n = _res$locals5.i18n;
                            _context5.next = 3;
                            return Model.findOneAndDelete({ _id: req.params.id }).setOptions({ user: user, i18n: i18n });

                        case 3:
                            instance = _context5.sent;

                            instance ? res.status(204).send() : next();

                        case 5:
                        case "end":
                            return _context5.stop();
                    }
                }
            }, _callee5, undefined);
        }));

        return function (_x13, _x14, _x15) {
            return _ref5.apply(this, arguments);
        };
    }(), function (err, req, res, next) {
        return errorHandler(err, res, next);
    });
};

exports.default = crudRouter;
//# sourceMappingURL=crud.js.map