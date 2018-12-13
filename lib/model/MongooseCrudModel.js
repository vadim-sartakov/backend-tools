"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sharedTools = require("shared-tools");

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MongooseCrudModel = function () {
    function MongooseCrudModel(Model) {
        _classCallCheck(this, MongooseCrudModel);

        this.Model = Model;
    }

    _createClass(MongooseCrudModel, [{
        key: "getResultFilter",
        value: function getResultFilter(queryFilter, permissionFilter, masterPermission) {
            var filterArray = [];
            if (permissionFilter && !masterPermission) filterArray.push(permissionFilter);
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
        key: "getAll",
        value: function () {
            var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(_ref) {
                var page = _ref.page,
                    size = _ref.size,
                    filter = _ref.filter,
                    sort = _ref.sort;
                var permissions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                var permissionFilter, read, readFields, getAllQuery, resultFilter;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                permissionFilter = permissions.filter, read = permissions.read, readFields = permissions.readFields;
                                getAllQuery = this.Model.find().skip(page * size).limit(size);

                                if (readFields) getAllQuery.select(readFields);
                                resultFilter = this.getResultFilter(filter, permissionFilter, read);

                                if (resultFilter) getAllQuery.where(resultFilter);
                                if (sort) getAllQuery.sort(sort);
                                getAllQuery.setOptions({ lean: true });
                                _context.next = 9;
                                return getAllQuery.exec();

                            case 9:
                                return _context.abrupt("return", _context.sent);

                            case 10:
                            case "end":
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function getAll(_x2) {
                return _ref2.apply(this, arguments);
            }

            return getAll;
        }()
    }, {
        key: "count",
        value: function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(filter) {
                var permissions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                var permissionFilter, read, countQuery, resultFilter;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                permissionFilter = permissions.filter, read = permissions.read;
                                countQuery = this.Model.count();
                                resultFilter = this.getResultFilter(filter, permissionFilter, read);

                                if (resultFilter) countQuery.where(resultFilter);
                                _context2.next = 6;
                                return countQuery.exec();

                            case 6:
                                return _context2.abrupt("return", _context2.sent);

                            case 7:
                            case "end":
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function count(_x4) {
                return _ref3.apply(this, arguments);
            }

            return count;
        }()
    }, {
        key: "addOne",
        value: function () {
            var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(payload) {
                var permissions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                var readFields, modifyFields, doc, saved;
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                readFields = permissions.readFields, modifyFields = permissions.modifyFields;

                                if (modifyFields) payload = (0, _sharedTools.filterObject)(payload, modifyFields);
                                doc = new this.Model(payload);
                                _context3.next = 5;
                                return doc.save();

                            case 5:
                                saved = _context3.sent;

                                saved = saved.toObject();
                                if (readFields) saved = (0, _sharedTools.filterObject)(saved, readFields);
                                return _context3.abrupt("return", saved);

                            case 9:
                            case "end":
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function addOne(_x6) {
                return _ref4.apply(this, arguments);
            }

            return addOne;
        }()
    }, {
        key: "getOne",
        value: function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(filter) {
                var permissions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                var permissionFilter, readFields, read, resultFilter, query;
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                filter = this.convertFitlerId(filter);
                                permissionFilter = permissions.filter, readFields = permissions.readFields, read = permissions.read;
                                resultFilter = this.getResultFilter(filter, permissionFilter, read);
                                query = this.Model.findOne(resultFilter);

                                if (readFields) query.select(readFields);
                                query.setOptions({ lean: true });
                                _context4.next = 8;
                                return query.exec();

                            case 8:
                                return _context4.abrupt("return", _context4.sent);

                            case 9:
                            case "end":
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function getOne(_x8) {
                return _ref5.apply(this, arguments);
            }

            return getOne;
        }()
    }, {
        key: "convertFitlerId",
        value: function convertFitlerId(filter) {
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
            var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(filter, payload) {
                var permissions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
                var permissionFilter, readFields, modifyFields, update, resultFilter, initialObject, updated;
                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                filter = this.convertFitlerId(filter);
                                permissionFilter = permissions.filter, readFields = permissions.readFields, modifyFields = permissions.modifyFields, update = permissions.update;
                                resultFilter = this.getResultFilter(filter, permissionFilter, update);
                                _context5.t0 = modifyFields;

                                if (!_context5.t0) {
                                    _context5.next = 8;
                                    break;
                                }

                                _context5.next = 7;
                                return this.Model.findOne(resultFilter).lean();

                            case 7:
                                _context5.t0 = _context5.sent;

                            case 8:
                                initialObject = _context5.t0;

                                payload = modifyFields && (0, _sharedTools.filterObject)(payload, modifyFields, initialObject) || payload;
                                _context5.next = 12;
                                return this.Model.findOneAndUpdate(resultFilter, payload, { new: true, lean: true });

                            case 12:
                                updated = _context5.sent;

                                if (readFields) updated = (0, _sharedTools.filterObject)(updated, readFields);
                                return _context5.abrupt("return", updated);

                            case 15:
                            case "end":
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function updateOne(_x10, _x11) {
                return _ref6.apply(this, arguments);
            }

            return updateOne;
        }()
    }, {
        key: "deleteOne",
        value: function () {
            var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(filter) {
                var permissions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                var permissionFilter, readFields, permissionDelete, resultFilter, deleted;
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                filter = this.convertFitlerId(filter);
                                permissionFilter = permissions.filter, readFields = permissions.readFields, permissionDelete = permissions.delete;
                                resultFilter = this.getResultFilter(filter, permissionFilter, permissionDelete);
                                _context6.next = 5;
                                return this.Model.findOneAndDelete(resultFilter).lean();

                            case 5:
                                deleted = _context6.sent;

                                if (readFields) deleted = (0, _sharedTools.filterObject)(deleted, readFields);
                                return _context6.abrupt("return", deleted);

                            case 8:
                            case "end":
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function deleteOne(_x13) {
                return _ref7.apply(this, arguments);
            }

            return deleteOne;
        }()
    }]);

    return MongooseCrudModel;
}();

exports.default = MongooseCrudModel;
//# sourceMappingURL=MongooseCrudModel.js.map