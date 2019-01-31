"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sharedTools = require("shared-tools");

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultPermissions = { create: {}, read: {}, update: {}, delete: {} };

var MongooseCrudModel = function () {
    function MongooseCrudModel(Model) {
        var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, MongooseCrudModel);

        var excerptProjection = opts.excerptProjection,
            populate = opts.populate,
            search = opts.search;

        this.Model = Model;
        this.excerptProjection = excerptProjection;
        this.populate = populate;
        this.search = search;
    }

    _createClass(MongooseCrudModel, [{
        key: "getResultFilter",
        value: function getResultFilter(queryFilter, permissionFilter) {
            if (queryFilter && queryFilter.search && this.search) {
                var search = Array.isArray(this.search) ? this.search : [this.search];
                search = search.map(function (searchField) {
                    return _defineProperty({}, searchField, new RegExp(".*" + queryFilter.search + ".*", 'i'));
                });
                delete queryFilter.search;
                Object.assign(queryFilter, { $or: [].concat(_toConsumableArray(search)) });
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
        key: "getAll",
        value: function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(_ref2, permissions) {
                var page = _ref2.page,
                    size = _ref2.size,
                    filter = _ref2.filter,
                    sort = _ref2.sort;

                var _permissions, _permissions$read, permissionFilter, permissionProjection, getAllQuery, projection, resultFilter;

                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                permissions = _extends({}, defaultPermissions, permissions);
                                _permissions = permissions, _permissions$read = _permissions.read, permissionFilter = _permissions$read.filter, permissionProjection = _permissions$read.projection;
                                getAllQuery = this.Model.find().skip(page * size).limit(size);
                                projection = this.excerptProjection || permissionProjection;

                                if (projection) getAllQuery.select(projection);
                                resultFilter = this.getResultFilter(filter, permissionFilter);

                                if (resultFilter) getAllQuery.where(resultFilter);
                                if (sort) getAllQuery.sort(sort);
                                this.applyPopulateIfRequired(getAllQuery);
                                getAllQuery.setOptions({ lean: true });
                                _context.next = 12;
                                return getAllQuery.exec();

                            case 12:
                                return _context.abrupt("return", _context.sent);

                            case 13:
                            case "end":
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function getAll(_x2, _x3) {
                return _ref3.apply(this, arguments);
            }

            return getAll;
        }()
    }, {
        key: "applyPopulateIfRequired",
        value: function applyPopulateIfRequired(query) {
            var _this = this;

            if (this.populate) Object.keys(this.populate).forEach(function (path) {
                return query.populate({ path: path, select: _this.populate[path] });
            });
        }
    }, {
        key: "count",
        value: function () {
            var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(filter, permissions) {
                var _permissions2, permissionFilter, countQuery, resultFilter;

                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                permissions = _extends({}, defaultPermissions, permissions);
                                _permissions2 = permissions, permissionFilter = _permissions2.read.filter;
                                countQuery = this.Model.count();
                                resultFilter = this.getResultFilter(filter, permissionFilter);

                                if (resultFilter) countQuery.where(resultFilter);
                                _context2.next = 7;
                                return countQuery.exec();

                            case 7:
                                return _context2.abrupt("return", _context2.sent);

                            case 8:
                            case "end":
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function count(_x4, _x5) {
                return _ref4.apply(this, arguments);
            }

            return count;
        }()
    }, {
        key: "addOne",
        value: function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(payload, permissions) {
                var _permissions3, projection, doc, saved;

                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                permissions = _extends({}, defaultPermissions, permissions);
                                _permissions3 = permissions, projection = _permissions3.update.projection;

                                if (projection) payload = (0, _sharedTools.filterObject)(payload, projection);
                                doc = new this.Model(payload);
                                _context3.next = 6;
                                return doc.save();

                            case 6:
                                saved = _context3.sent;
                                return _context3.abrupt("return", saved.toObject());

                            case 8:
                            case "end":
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function addOne(_x6, _x7) {
                return _ref5.apply(this, arguments);
            }

            return addOne;
        }()
    }, {
        key: "getOne",
        value: function () {
            var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(filter, permissions) {
                var _permissions4, _permissions4$read, permissionFilter, projection, resultFilter, query;

                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                filter = this.convertFitlerId(filter);
                                permissions = _extends({}, defaultPermissions, permissions);
                                _permissions4 = permissions, _permissions4$read = _permissions4.read, permissionFilter = _permissions4$read.filter, projection = _permissions4$read.projection;
                                resultFilter = this.getResultFilter(filter, permissionFilter);
                                query = this.Model.findOne(resultFilter);

                                if (projection) query.select(projection);
                                this.applyPopulateIfRequired(query);
                                query.setOptions({ lean: true });
                                _context4.next = 10;
                                return query.exec();

                            case 10:
                                return _context4.abrupt("return", _context4.sent);

                            case 11:
                            case "end":
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function getOne(_x8, _x9) {
                return _ref6.apply(this, arguments);
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
            var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(filter, payload, permissions) {
                var _permissions5, permissionFilter, projection, resultFilter, initialObject, updated;

                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                filter = this.convertFitlerId(filter);
                                permissions = _extends({}, defaultPermissions, permissions);
                                _permissions5 = permissions, permissionFilter = _permissions5.read.filter, projection = _permissions5.update.projection;
                                resultFilter = this.getResultFilter(filter, permissionFilter);

                                if (!projection) {
                                    _context5.next = 9;
                                    break;
                                }

                                _context5.next = 7;
                                return this.Model.findOne(resultFilter).lean();

                            case 7:
                                initialObject = _context5.sent;

                                payload = (0, _sharedTools.filterObject)(payload, projection, initialObject);

                            case 9:
                                _context5.next = 11;
                                return this.Model.findOneAndUpdate(resultFilter, payload, { new: true, lean: true });

                            case 11:
                                updated = _context5.sent;
                                return _context5.abrupt("return", updated);

                            case 13:
                            case "end":
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function updateOne(_x10, _x11, _x12) {
                return _ref7.apply(this, arguments);
            }

            return updateOne;
        }()
    }, {
        key: "deleteOne",
        value: function () {
            var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(filter, permissions) {
                var _permissions6, permissionFilter, resultFilter, deleted;

                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                filter = this.convertFitlerId(filter);
                                permissions = _extends({}, defaultPermissions, permissions);
                                _permissions6 = permissions, permissionFilter = _permissions6.read.filter;
                                resultFilter = this.getResultFilter(filter, permissionFilter);
                                _context6.next = 6;
                                return this.Model.findOneAndDelete(resultFilter).lean();

                            case 6:
                                deleted = _context6.sent;
                                return _context6.abrupt("return", deleted);

                            case 8:
                            case "end":
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function deleteOne(_x13, _x14) {
                return _ref8.apply(this, arguments);
            }

            return deleteOne;
        }()
    }]);

    return MongooseCrudModel;
}();

exports.default = MongooseCrudModel;
//# sourceMappingURL=MongooseCrudModel.js.map