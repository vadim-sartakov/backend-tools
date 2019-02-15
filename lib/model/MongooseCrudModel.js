'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _CrudModel2 = require('./CrudModel');

var _CrudModel3 = _interopRequireDefault(_CrudModel2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MongooseCrudModel = function (_CrudModel) {
  _inherits(MongooseCrudModel, _CrudModel);

  function MongooseCrudModel(Model) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, MongooseCrudModel);

    var _this = _possibleConstructorReturn(this, (MongooseCrudModel.__proto__ || Object.getPrototypeOf(MongooseCrudModel)).call(this, opts));

    var populate = opts.populate;

    _this.Model = Model;
    _this.populate = populate;
    _this.underscoredId = true;
    return _this;
  }

  _createClass(MongooseCrudModel, [{
    key: 'searchFieldsToFilter',
    value: function searchFieldsToFilter(search, query) {
      return search.map(function (searchField) {
        return _defineProperty({}, searchField, new RegExp('.*' + query + '.*', 'i'));
      });
    }
  }, {
    key: 'convertToMongooseProjection',
    value: function convertToMongooseProjection(_ref2) {
      var exclusive = _ref2.exclusive,
          paths = _ref2.paths;

      return (exclusive ? '-' : '') + paths.join(exclusive ? ' -' : ' ');
    }
  }, {
    key: 'execGetAll',
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(_ref3) {
        var page = _ref3.page,
            size = _ref3.size,
            projection = _ref3.projection,
            filter = _ref3.filter,
            sort = _ref3.sort;
        var getAllQuery;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                getAllQuery = this.Model.find().skip(page * size).limit(size);

                if (projection) getAllQuery.select(this.convertToMongooseProjection(projection));
                if (filter) getAllQuery.where(filter);
                if (sort) getAllQuery.sort(sort);
                this.applyPopulateIfRequired(getAllQuery);
                getAllQuery.setOptions({ lean: true });
                _context.next = 8;
                return getAllQuery.exec();

              case 8:
                return _context.abrupt('return', _context.sent);

              case 9:
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
    key: 'applyPopulateIfRequired',
    value: function applyPopulateIfRequired(query) {
      var _this2 = this;

      if (this.populate) Object.keys(this.populate).forEach(function (path) {
        return query.populate({ path: path, select: _this2.populate[path] });
      });
    }
  }, {
    key: 'execCount',
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(filter) {
        var countQuery;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                countQuery = this.Model.count();

                if (filter) countQuery.where(filter);
                _context2.next = 4;
                return countQuery.exec();

              case 4:
                return _context2.abrupt('return', _context2.sent);

              case 5:
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
        var doc, saved;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                doc = new this.Model(payload);
                _context3.next = 3;
                return doc.save();

              case 3:
                saved = _context3.sent;
                return _context3.abrupt('return', saved.toObject());

              case 5:
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
        var query;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                query = this.Model.findOne(filter);

                if (projection) query.select(this.convertToMongooseProjection(projection));
                this.applyPopulateIfRequired(query);
                query.setOptions({ lean: true });
                _context4.next = 6;
                return query.exec();

              case 6:
                return _context4.abrupt('return', _context4.sent);

              case 7:
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
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.Model.findOneAndUpdate(filter, payload, { new: true, lean: true });

              case 2:
                return _context5.abrupt('return', _context5.sent);

              case 3:
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
      var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(filter) {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.Model.findOneAndDelete(filter).lean();

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
        return _ref10.apply(this, arguments);
      }

      return execDeleteOne;
    }()
  }]);

  return MongooseCrudModel;
}(_CrudModel3.default);

exports.default = MongooseCrudModel;
//# sourceMappingURL=MongooseCrudModel.js.map