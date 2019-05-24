"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _express = require("express");

var _querystring = require("querystring");

var _querystring2 = _interopRequireDefault(_querystring);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _httpLinkHeader = require("http-link-header");

var _httpLinkHeader2 = _interopRequireDefault(_httpLinkHeader);

var _commonTools = require("common-tools");

var _utils = require("../utils");

var _middleware = require("../middleware");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultOptions = {
  idProperty: '_id',
  returnValue: false,
  getAll: {
    defaultPageSize: 20
  },
  addOne: {},
  getOne: {},
  updateOne: {},
  deleteOne: {}
};

var defaultPermissions = {
  create: {},
  read: {},
  update: {},
  delete: {}
};

var CrudRouter = function () {
  function CrudRouter(crudModel, options) {
    _classCallCheck(this, CrudRouter);

    this.crudModel = crudModel;
    this.options = _lodash2.default.merge({}, defaultOptions, options);
    this.router = new _express.Router();

    this.rootRouter = this.router.route("/");
    !this.options.getAll.disable && this.rootRouter.get(this.createChain(getAll, "read"));
    !this.options.addOne.disable && this.rootRouter.post(this.createChain(addOne, "read", "create"));

    this.idRouter = this.router.route("/:id");
    !this.options.getOne.disable && this.idRouter.get(this.createChain(getOne, "read"));
    !this.options.updateOne.disable && this.idRouter.put(this.createChain(updateOne, "read", "update"));
    !this.options.deleteOne.disable && this.idRouter.delete(this.createChain(deleteOne, "read", "delete"));
  }

  _createClass(CrudRouter, [{
    key: "createChain",
    value: function createChain(middleware) {
      var chain = [];

      for (var _len = arguments.length, securityModifiers = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        securityModifiers[_key - 1] = arguments[_key];
      }

      this.options.securitySchema && chain.push(_middleware.security.apply(undefined, [this.options.securitySchema].concat(securityModifiers)));
      this.options.validationSchema && chain.push((0, _middleware.validator)(this.options.validationSchema));
      chain.push(middleware(this.crudModel, this.options));
      return chain;
    }
  }]);

  return CrudRouter;
}();

var mergeFilters = function mergeFilters() {
  for (var _len2 = arguments.length, filters = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    filters[_key2] = arguments[_key2];
  }

  var resultFilters = filters.filter(function (item) {
    return Boolean(item);
  });
  if (!resultFilters.length) return;
  return resultFilters.length === 1 ? resultFilters[0] : { $and: resultFilters };
};

var getAll = function getAll(Model, options) {
  return (0, _utils.asyncMiddleware)(function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(req, res) {
      var _options$getAll, defaultPageSize, defaultProjection, permissions, _req$query, page, size, queryFilter, sort, search, queryOptions, filter, projection, result, totalCount, lastPage, prev, nextPage, link, currentUrl;

      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _options$getAll = options.getAll, defaultPageSize = _options$getAll.defaultPageSize, defaultProjection = _options$getAll.defaultProjection;
              permissions = _lodash2.default.merge({}, defaultPermissions, res.locals.permissions);
              _req$query = req.query, page = _req$query.page, size = _req$query.size, queryFilter = _req$query.filter, sort = _req$query.sort, search = _req$query.search;

              // 'supertest' passes objects here, but real http request will have strings

              if (filter && typeof filter === "string") queryFilter = JSON.parse(queryFilter);
              if (sort && typeof sort === "string") sort = JSON.parse(sort);

              // Converting to number by multiplying by 1
              page = page && page * 1 || 0;
              size = size && size * 1 || defaultPageSize;

              queryOptions = { page: page, size: size };
              filter = mergeFilters(permissions.read.filter, queryFilter);
              projection = permissions.read.projection || defaultProjection;


              if (filter) queryOptions.filter = filter;
              if (projection) queryOptions.projection = projection;
              if (sort) queryOptions.sort = sort;
              if (search) queryOptions.search = search;

              _context.next = 16;
              return Model.getAll(queryOptions);

            case 16:
              result = _context.sent;
              _context.next = 19;
              return Model.count(filter);

            case 19:
              totalCount = _context.sent;
              lastPage = Math.max(Math.ceil(totalCount / size) - 1, 0);
              prev = Math.max(page - 1, 0);
              nextPage = Math.min(page + 1, totalCount, lastPage);
              link = new _httpLinkHeader2.default();
              currentUrl = (0, _utils.getCurrentUrl)(req);

              link.set({ uri: currentUrl + "?" + _querystring2.default.stringify({ page: 0, size: size }), rel: "first" });
              page > 0 && link.set({ uri: currentUrl + "?" + _querystring2.default.stringify({ page: prev, size: size }), rel: "previous" });
              page < lastPage && link.set({ uri: currentUrl + "?" + _querystring2.default.stringify({ page: nextPage, size: size }), rel: "next" });
              link.set({ uri: currentUrl + "?" + _querystring2.default.stringify({ page: lastPage, size: size }), rel: "last" });

              res.set("X-Total-Count", totalCount);
              res.set("Link", link.toString());
              res.json(result);

            case 32:
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
  return (0, _utils.getCurrentUrl)(req) + "/" + id;
};

var addOne = function addOne(Model, options) {
  return (0, _utils.asyncMiddleware)(function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(req, res) {
      var returnValue, permissions, payload, instance, id;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              returnValue = options.returnValue;
              permissions = _lodash2.default.merge({}, defaultPermissions, res.locals.permissions);
              payload = _lodash2.default.cloneDeep(req.body);

              if (permissions.create.projection) payload = (0, _commonTools.filterObject)(payload, permissions.create.projection);

              _context2.next = 6;
              return Model.addOne(payload);

            case 6:
              instance = _context2.sent;
              id = instance[options.idProperty];

              res.status(201);
              res.location(getLocation(req, id));

              if (!returnValue) {
                _context2.next = 17;
                break;
              }

              _context2.next = 13;
              return secureGetOne(Model, options, id, permissions);

            case 13:
              instance = _context2.sent;

              res.json(instance);
              _context2.next = 18;
              break;

            case 17:
              res.end();

            case 18:
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

var getOne = function getOne(Model, options) {
  return (0, _utils.asyncMiddleware)(function () {
    var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(req, res, next) {
      var permissions, instance;
      return regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              permissions = _lodash2.default.merge({}, defaultPermissions, res.locals.permissions);
              _context3.next = 3;
              return secureGetOne(Model, options, req.params.id, permissions);

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

var secureGetOne = function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(Model, options, id, permissions) {
    var defaultProjection, projection, filter;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            defaultProjection = options.getOne.defaultProjection;
            projection = permissions.read.projection || defaultProjection;
            filter = mergeFilters(_defineProperty({}, options.idProperty, id), permissions.read.filter);
            return _context4.abrupt("return", Model.getOne(filter, projection));

          case 4:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, undefined);
  }));

  return function secureGetOne(_x8, _x9, _x10, _x11) {
    return _ref4.apply(this, arguments);
  };
}();

var updateOne = function updateOne(Model, options) {
  return (0, _utils.asyncMiddleware)(function () {
    var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(req, res, next) {
      var returnValue, permissions, payload, originInstance, filter, result, instance;
      return regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              returnValue = options.returnValue;
              permissions = _lodash2.default.merge({}, defaultPermissions, res.locals.permissions);
              payload = _lodash2.default.cloneDeep(req.body);

              if (!permissions.update.projection) {
                _context5.next = 8;
                break;
              }

              _context5.next = 6;
              return secureGetOne(Model, options, req.params.id, permissions);

            case 6:
              originInstance = _context5.sent;

              payload = (0, _commonTools.filterObject)(payload, permissions.update.projection, originInstance);

            case 8:
              filter = mergeFilters(_defineProperty({}, options.idProperty, req.params.id), permissions.read.filter);
              _context5.next = 11;
              return Model.updateOne(filter, payload);

            case 11:
              result = _context5.sent;

              if (result) {
                _context5.next = 14;
                break;
              }

              return _context5.abrupt("return", next());

            case 14:
              if (!returnValue) {
                _context5.next = 21;
                break;
              }

              _context5.next = 17;
              return secureGetOne(Model, options, req.params.id, permissions);

            case 17:
              instance = _context5.sent;

              res.json(instance);
              _context5.next = 22;
              break;

            case 21:
              res.end();

            case 22:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, undefined);
    }));

    return function (_x12, _x13, _x14) {
      return _ref5.apply(this, arguments);
    };
  }());
};

var deleteOne = function deleteOne(Model, options) {
  return (0, _utils.asyncMiddleware)(function () {
    var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(req, res, next) {
      var returnValue, permissions, valueToDelete, filter, result;
      return regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              returnValue = options.returnValue;
              permissions = _lodash2.default.merge({}, defaultPermissions, res.locals.permissions);
              valueToDelete = void 0;

              if (!returnValue) {
                _context6.next = 7;
                break;
              }

              _context6.next = 6;
              return secureGetOne(Model, options, req.params.id, permissions);

            case 6:
              valueToDelete = _context6.sent;

            case 7:
              filter = mergeFilters(_defineProperty({}, options.idProperty, req.params.id), permissions.read.filter);
              _context6.next = 10;
              return Model.deleteOne(filter);

            case 10:
              result = _context6.sent;

              if (result) {
                _context6.next = 13;
                break;
              }

              return _context6.abrupt("return", next());

            case 13:

              if (returnValue) {
                res.json(valueToDelete);
              } else {
                res.status(204);
                res.end();
              }

            case 14:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, undefined);
    }));

    return function (_x15, _x16, _x17) {
      return _ref6.apply(this, arguments);
    };
  }());
};

exports.default = CrudRouter;
//# sourceMappingURL=crud.js.map