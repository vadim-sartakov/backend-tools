"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sharedTools = require("shared-tools");

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultPermissions = { create: {}, read: {}, update: {}, delete: {} };

var CrudModel = function () {
  function CrudModel(_ref) {
    var excerptProjection = _ref.excerptProjection,
        searchFields = _ref.searchFields;

    _classCallCheck(this, CrudModel);

    this.excerptProjection = excerptProjection;
    this.searchFields = searchFields;
  }

  _createClass(CrudModel, [{
    key: "getAll",
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(_ref2, permissions) {
        var _ref2$page = _ref2.page,
            page = _ref2$page === undefined ? 0 : _ref2$page,
            _ref2$size = _ref2.size,
            size = _ref2$size === undefined ? 20 : _ref2$size,
            filter = _ref2.filter,
            sort = _ref2.sort;

        var _permissions, _permissions$read, permissionFilter, permissionProjection, projection, resultFilter;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                permissions = _extends({}, defaultPermissions, permissions);
                _permissions = permissions, _permissions$read = _permissions.read, permissionFilter = _permissions$read.filter, permissionProjection = _permissions$read.projection;
                projection = this.getReadProjection(permissionProjection);
                resultFilter = this.getResultFilter(filter, permissionFilter);
                _context.next = 6;
                return this.execGetAll({
                  page: page,
                  size: size,
                  projection: projection,
                  filter: resultFilter,
                  sort: sort
                });

              case 6:
                return _context.abrupt("return", _context.sent);

              case 7:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function getAll(_x, _x2) {
        return _ref3.apply(this, arguments);
      }

      return getAll;
    }()
  }, {
    key: "getResultFilter",
    value: function getResultFilter(queryFilter, permissionFilter) {

      if (queryFilter && queryFilter.search && this.searchFields) {
        var search = Array.isArray(this.searchFields) ? this.searchFields : [this.searchFields];
        Object.assign(queryFilter, { $or: [].concat(_toConsumableArray(this.searchFieldsToFilter(search, queryFilter.search))) });
        delete queryFilter.search;
      }
      var filterArray = [];
      if (permissionFilter) filterArray.push(permissionFilter);
      if (queryFilter) filterArray.push(queryFilter);
      var resultFilter = void 0;
      switch (filterArray.length) {
        case 1:
          resultFilter = filterArray[0];
          break;
        case 2:
          resultFilter = { $and: filterArray };
          break;
        default:
      }
      return resultFilter;
    }
  }, {
    key: "getReadProjection",
    value: function getReadProjection(permissionProjection) {
      return this.excerptProjection || permissionProjection;
    }
  }, {
    key: "count",
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(filter, permissions) {
        var _permissions2, permissionFilter, resultFilter;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                permissions = _extends({}, defaultPermissions, permissions);
                _permissions2 = permissions, permissionFilter = _permissions2.read.filter;
                resultFilter = this.getResultFilter(filter, permissionFilter);
                _context2.next = 5;
                return this.execCount(resultFilter);

              case 5:
                return _context2.abrupt("return", _context2.sent);

              case 6:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function count(_x3, _x4) {
        return _ref4.apply(this, arguments);
      }

      return count;
    }()
  }, {
    key: "addOne",
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(payload, permissions) {
        var _permissions3, projection;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                permissions = _extends({}, defaultPermissions, permissions);
                _permissions3 = permissions, projection = _permissions3.update.projection;

                if (projection) payload = (0, _sharedTools.filterObject)(payload, projection);
                return _context3.abrupt("return", this.execAddOne(payload));

              case 4:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function addOne(_x5, _x6) {
        return _ref5.apply(this, arguments);
      }

      return addOne;
    }()
  }, {
    key: "getOne",
    value: function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(filter, permissions) {
        var _permissions4, _permissions4$read, permissionFilter, permissionProjection, projection, resultFilter;

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (this.underscoredId) filter = this.addIdUnderscore(filter);
                permissions = _extends({}, defaultPermissions, permissions);
                _permissions4 = permissions, _permissions4$read = _permissions4.read, permissionFilter = _permissions4$read.filter, permissionProjection = _permissions4$read.projection;
                projection = this.getReadProjection(permissionProjection);
                resultFilter = this.getResultFilter(filter, permissionFilter);
                _context4.next = 7;
                return this.execGetOne({ filter: resultFilter, projection: projection });

              case 7:
                return _context4.abrupt("return", _context4.sent);

              case 8:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function getOne(_x7, _x8) {
        return _ref6.apply(this, arguments);
      }

      return getOne;
    }()
  }, {
    key: "addIdUnderscore",
    value: function addIdUnderscore(filter) {
      var result = void 0;
      if (filter && filter.id) {
        result = _extends({}, filter);
        result._id = result.id;
        delete result.id;
      }
      return result;
    }
  }, {
    key: "updateOne",
    value: function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(filter, payload, permissions) {
        var _permissions5, permissionFilter, projection, initialObject, resultFilter;

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (this.underscoredId) filter = this.addIdUnderscore(filter);
                permissions = _extends({}, defaultPermissions, permissions);
                _permissions5 = permissions, permissionFilter = _permissions5.read.filter, projection = _permissions5.update.projection;

                if (!projection) {
                  _context5.next = 8;
                  break;
                }

                _context5.next = 6;
                return this.execGetOne(filter);

              case 6:
                initialObject = _context5.sent;

                payload = (0, _sharedTools.filterObject)(payload, projection, initialObject);

              case 8:
                resultFilter = this.getResultFilter(filter, permissionFilter);
                _context5.next = 11;
                return this.execUpdateOne(resultFilter, payload);

              case 11:
                return _context5.abrupt("return", _context5.sent);

              case 12:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function updateOne(_x9, _x10, _x11) {
        return _ref7.apply(this, arguments);
      }

      return updateOne;
    }()
  }, {
    key: "deleteOne",
    value: function () {
      var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(filter, permissions) {
        var _permissions6, permissionFilter, resultFilter;

        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if (this.underscoredId) filter = this.addIdUnderscore(filter);
                permissions = _extends({}, defaultPermissions, permissions);
                _permissions6 = permissions, permissionFilter = _permissions6.read.filter;
                resultFilter = this.getResultFilter(filter, permissionFilter);
                _context6.next = 6;
                return this.execDeleteOne(resultFilter);

              case 6:
                return _context6.abrupt("return", _context6.sent);

              case 7:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function deleteOne(_x12, _x13) {
        return _ref8.apply(this, arguments);
      }

      return deleteOne;
    }()
  }]);

  return CrudModel;
}();

exports.default = CrudModel;
//# sourceMappingURL=CrudModel.js.map