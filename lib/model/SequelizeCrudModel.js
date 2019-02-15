'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _commonTools = require('common-tools');

var _CrudModel2 = require('./CrudModel');

var _CrudModel3 = _interopRequireDefault(_CrudModel2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SequelizeCrudModel = function (_CrudModel) {
  _inherits(SequelizeCrudModel, _CrudModel);

  function SequelizeCrudModel(Model) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, SequelizeCrudModel);

    var _this = _possibleConstructorReturn(this, (SequelizeCrudModel.__proto__ || Object.getPrototypeOf(SequelizeCrudModel)).call(this, opts));

    _this.Model = Model;
    _this.include = _this.loadFieldsToInclude(_this.loadFields);
    return _this;
  }

  _createClass(SequelizeCrudModel, [{
    key: 'searchFieldsToFilter',
    value: function searchFieldsToFilter(search, query) {
      return search.map(function (searchField) {
        var paths = searchField.split('.');
        var field = paths.length === 1 ? searchField : '$' + searchField + '$';
        return _defineProperty({}, field, { $iLike: '%' + query + '%' });
      });
    }
  }, {
    key: 'loadFieldsToInclude',
    value: function loadFieldsToInclude(loadFields) {
      var _this2 = this;

      if (loadFields === undefined) return undefined;
      return Object.keys(loadFields).map(function (field) {
        return {
          association: field,
          attributes: _this2.convertProjectionToAttributes((0, _commonTools.createProjection)(loadFields[field])),
          // Without this option, malformed query produced
          // It throws SequelizeDatabaseError: missing FROM-clause entry for table
          duplicating: false
        };
      });
    }
  }, {
    key: 'convertProjectionToAttributes',
    value: function convertProjectionToAttributes(_ref2) {
      var exclusive = _ref2.exclusive,
          paths = _ref2.paths;

      return exclusive ? { exclude: paths } : paths;
    }
  }, {
    key: 'execGetAll',
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(_ref3) {
        var _ref3$page = _ref3.page,
            page = _ref3$page === undefined ? 0 : _ref3$page,
            _ref3$size = _ref3.size,
            size = _ref3$size === undefined ? 20 : _ref3$size,
            projection = _ref3.projection,
            filter = _ref3.filter,
            sort = _ref3.sort;
        var params;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                params = { limit: size, offset: size * page };

                if (projection) params.attributes = this.convertProjectionToAttributes(projection);
                if (filter) params.where = filter;
                if (sort) params.order = this.convertSort(sort);
                if (this.include) params.include = this.include;
                _context.next = 7;
                return this.Model.findAll(params);

              case 7:
                return _context.abrupt('return', _context.sent);

              case 8:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function execGetAll(_x2) {
        return _ref4.apply(this, arguments);
      }

      return execGetAll;
    }()
  }, {
    key: 'convertSort',
    value: function convertSort(sort) {
      if (!sort || (typeof sort === 'undefined' ? 'undefined' : _typeof(sort)) !== 'object') return;
      var keys = Object.keys(sort);
      if (keys.length === 0) return;
      return keys.map(function (key) {
        return [key, sort[key] === 1 ? 'ASC' : 'DESC'];
      });
    }
  }, {
    key: 'execCount',
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(filter) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.Model.count({ where: filter });

              case 2:
                return _context2.abrupt('return', _context2.sent);

              case 3:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function execCount(_x3) {
        return _ref5.apply(this, arguments);
      }

      return execCount;
    }()
  }, {
    key: 'execAddOne',
    value: function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(payload) {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.Model.create(payload);

              case 2:
                return _context3.abrupt('return', _context3.sent);

              case 3:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function execAddOne(_x4) {
        return _ref6.apply(this, arguments);
      }

      return execAddOne;
    }()
  }, {
    key: 'execGetOne',
    value: function () {
      var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(_ref7) {
        var filter = _ref7.filter,
            projection = _ref7.projection;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.Model.find({
                  attributes: this.convertProjectionToAttributes(projection),
                  where: filter
                });

              case 2:
                return _context4.abrupt('return', _context4.sent);

              case 3:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function execGetOne(_x5) {
        return _ref8.apply(this, arguments);
      }

      return execGetOne;
    }()
  }, {
    key: 'execUpdateOne',
    value: function () {
      var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(filter, payload) {
        var _ref10, _ref11, affected, result;

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.Model.update(payload, { where: filter, returning: true });

              case 2:
                _ref10 = _context5.sent;
                _ref11 = _slicedToArray(_ref10, 2);
                affected = _ref11[0];
                result = _ref11[1];

                if (!(affected === 0)) {
                  _context5.next = 8;
                  break;
                }

                return _context5.abrupt('return', null);

              case 8:
                return _context5.abrupt('return', result[0]);

              case 9:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function execUpdateOne(_x6, _x7) {
        return _ref9.apply(this, arguments);
      }

      return execUpdateOne;
    }()
  }, {
    key: 'execDeleteOne',
    value: function () {
      var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(filter) {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.Model.destroy({ where: filter, returning: true });

              case 2:
                return _context6.abrupt('return', _context6.sent);

              case 3:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function execDeleteOne(_x8) {
        return _ref12.apply(this, arguments);
      }

      return execDeleteOne;
    }()
  }]);

  return SequelizeCrudModel;
}(_CrudModel3.default);

exports.default = SequelizeCrudModel;
//# sourceMappingURL=SequelizeCrudModel.js.map