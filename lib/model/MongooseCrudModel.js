"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MongooseCrudModel = function () {
  function MongooseCrudModel(Model) {
    _classCallCheck(this, MongooseCrudModel);

    this.Model = Model;
  }

  _createClass(MongooseCrudModel, [{
    key: "getAll",
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(_ref) {
        var page = _ref.page,
            size = _ref.size,
            filter = _ref.filter,
            projection = _ref.projection,
            sort = _ref.sort,
            search = _ref.search;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", this.Model.graphFind({ page: page, size: size, filter: filter, projection: projection, sort: sort, search: search }));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function getAll(_x) {
        return _ref2.apply(this, arguments);
      }

      return getAll;
    }()
  }, {
    key: "count",
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(filter) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt("return", this.Model.count(filter));

              case 1:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function count(_x2) {
        return _ref3.apply(this, arguments);
      }

      return count;
    }()
  }, {
    key: "getOne",
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(filter, projection) {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                return _context3.abrupt("return", this.Model.graphFindOne({ filter: filter, projection: projection }));

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function getOne(_x3, _x4) {
        return _ref4.apply(this, arguments);
      }

      return getOne;
    }()
  }, {
    key: "addOne",
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(payload) {
        var instance, saved;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return new this.Model(payload).save();

              case 2:
                instance = _context4.sent;
                _context4.next = 5;
                return instance.save();

              case 5:
                saved = _context4.sent;
                return _context4.abrupt("return", saved);

              case 7:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function addOne(_x5) {
        return _ref5.apply(this, arguments);
      }

      return addOne;
    }()
  }, {
    key: "updateOne",
    value: function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(filter, payload) {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.Model.findOneAndUpdate(filter, payload, { new: true });

              case 2:
                return _context5.abrupt("return", _context5.sent);

              case 3:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function updateOne(_x6, _x7) {
        return _ref6.apply(this, arguments);
      }

      return updateOne;
    }()
  }, {
    key: "deleteOne",
    value: function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(filter) {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.Model.findOneAndDelete(filter).lean();

              case 2:
                return _context6.abrupt("return", _context6.sent);

              case 3:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function deleteOne(_x8) {
        return _ref7.apply(this, arguments);
      }

      return deleteOne;
    }()
  }]);

  return MongooseCrudModel;
}();

exports.default = MongooseCrudModel;
//# sourceMappingURL=MongooseCrudModel.js.map