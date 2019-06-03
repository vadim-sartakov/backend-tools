'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var graphFindOne = function () {
  var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(options) {
    var result;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return graphFind.call(this, _extends({}, options, { limit: 1 }));

          case 2:
            result = _context.sent;
            return _context.abrupt('return', result.length > 0 ? result[0] : null);

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function graphFindOne(_x3) {
    return _ref6.apply(this, arguments);
  };
}();

exports.graphFind = graphFind;

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var checkIsExclusive = function checkIsExclusive(projection) {
  var keys = Object.keys(projection);
  return projection[keys[0]] === 0;
};

var shouldIncludePath = function shouldIncludePath(path, projection) {
  if (!projection) return true;
  var keys = Object.keys(projection);
  var isExclusive = checkIsExclusive(projection);
  var pathInProjection = keys.some(function (key) {
    return isExclusive ? key === path : key.startsWith(path) || path.startsWith(key);
  });
  return isExclusive && !pathInProjection || !isExclusive && pathInProjection ? true : false;
};

function reduceSchemaRecursive(schema, reducer, initialValue) {
  var _this = this;

  var context = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var _context$paths = context.paths,
      paths = _context$paths === undefined ? [] : _context$paths,
      _context$level = context.level,
      level = _context$level === undefined ? 0 : _context$level,
      maxDepth = context.maxDepth,
      projection = context.projection,
      parentArrays = context.parentArrays,
      parentRef = context.parentRef,
      collectionName = context.collectionName;

  return Object.keys(schema.paths).reduce(function (accumulator, path) {
    var currentSchemaPath = schema.paths[path];
    var options = currentSchemaPath.caster && currentSchemaPath.caster.options || currentSchemaPath.options;
    var currentPaths = [].concat(_toConsumableArray(paths), [path]);
    var currentPathsString = currentPaths.join('.');
    var nextDepth = maxDepth === true ? maxDepth : maxDepth - 1;
    var nextParentArrays = currentSchemaPath.instance === 'Array' ? [].concat(_toConsumableArray(parentArrays || []), [currentPathsString]) : parentArrays;
    var includePath = shouldIncludePath(currentPathsString, projection);

    var currentAccValue = includePath && reducer(accumulator, currentPathsString, currentSchemaPath, options, { level: level, parentArrays: parentArrays, parentRef: parentRef, collectionName: collectionName }) || accumulator;
    if (options.ref && (nextDepth === true || nextDepth >= 0) && includePath) {
      var targetModel = _this.db.model(options.ref);
      var targetCollectionName = targetModel.collection.collectionName;
      currentAccValue = reduceSchemaRecursive.call(_this, targetModel.schema, reducer, currentAccValue, {
        paths: currentPaths,
        level: level + 1,
        maxDepth: nextDepth,
        projection: projection,
        parentArrays: nextParentArrays,
        parentRef: currentPathsString,
        collectionName: targetCollectionName
      });
    } else if (currentSchemaPath.schema && includePath) {
      currentAccValue = reduceSchemaRecursive.call(_this, currentSchemaPath.schema, reducer, currentAccValue, {
        paths: currentPaths,
        level: level,
        maxDepth: maxDepth,
        projection: projection,
        parentArrays: nextParentArrays
      });
    }
    return currentAccValue;
  }, initialValue);
}

var searchQueryToFilter = function searchQueryToFilter(schema, searchQuery) {
  var searchFields = schema.options.searchFields;

  if (!searchQuery || !searchFields) return;
  var filters = searchFields.map(function (searchField) {
    return _defineProperty({}, searchField, new RegExp('.*' + searchQuery + '.*', 'i'));
  });
  return { $or: filters };
};

var dotToUnderscore = function dotToUnderscore(property) {
  return property.replace(/\.+/g, '_');
};

var getRootGroupProperties = function getRootGroupProperties(pathsMeta) {
  var rootGroupProperties = pathsMeta.filter(function (path) {
    return path.level === 0 && path.property !== '_id';
  });
  rootGroupProperties = rootGroupProperties.reduce(function (accumulator, path) {
    // In case of nested objects, always pick the root property.
    var curPath = path.property.split('.')[0];
    return accumulator[curPath] ? accumulator : _extends({}, accumulator, _defineProperty({}, curPath, { $first: '$' + curPath }));
  }, {});
  return rootGroupProperties;
};

var getJoinAndGroupPipeline = function getJoinAndGroupPipeline(pathsMeta) {
  var pathsToJoin = pathsMeta.filter(function (path) {
    return path.property.includes('_id') && path.parentRef !== undefined;
  });
  if (!pathsToJoin.length) return [];

  var rootGroupProperties = getRootGroupProperties(pathsMeta);

  // Grouping by parent arrays property, so references same level deep
  // should be processed by the same step
  var groupedPaths = pathsToJoin.reduce(function (accumulator, path, index) {
    var key = path.parentArrays && path.parentArrays.join('_') || 'root';
    var entry = accumulator[key] && Object.assign({}, accumulator[key]) || { parentArrays: path.parentArrays, paths: [], index: index };
    entry.paths.push(path);
    return _extends({}, accumulator, _defineProperty({}, key, entry));
  }, {});
  var groupedByParentArrays = Object.keys(groupedPaths).reduce(function (accumulator, key) {
    var value = groupedPaths[key];
    return [].concat(_toConsumableArray(accumulator), [value]);
  }, []).sort(function (a, b) {
    return a.index > b.index ? 1 : a.index < b.index ? -1 : 0;
  });

  var pipeline = groupedByParentArrays.reduce(function (accumulator, item) {
    var result = [].concat(_toConsumableArray(accumulator));
    item.parentArrays && item.parentArrays.forEach(function (array, index, sourceArray) {
      var curPath = '$' + array;
      var $unwind = {
        path: curPath,
        preserveNullAndEmptyArrays: true
      };
      // Since grouping does not guarantee order, we have to maintain
      // array indexes to restore order right after grouping
      if (sourceArray.length > 1) $unwind.includeArrayIndex = 'indexes.' + dotToUnderscore(array);
      result.push({ $unwind: $unwind });
    });

    item.paths.forEach(function (path) {
      var parts = path.property.split('.');
      var localField = parts.splice(0, parts.length - 1).join('.');
      result.push({
        $lookup: {
          from: path.collectionName,
          localField: localField,
          foreignField: '_id',
          as: localField
        }
      }, {
        $unwind: {
          path: '$' + localField,
          preserveNullAndEmptyArrays: true
        }
      });
    });

    // Executing revere here to make sure deep nested references go first
    item.parentArrays && item.parentArrays.slice(0).reverse().forEach(function (arrayItem, index, array) {
      var curPath = '$' + arrayItem;
      var nextArray = array[index + 1];
      // Since grouping does not support dot-notatation in properties,
      // making some workaround here by replacing dot's with underscores and adding another
      // pipeline steps to fix the issue.
      var underscoredPath = arrayItem.includes('.') && dotToUnderscore(arrayItem);
      var arrayGroupProperty = _defineProperty({}, underscoredPath || arrayItem, { $push: curPath });

      var groupStep = _extends({}, rootGroupProperties, arrayGroupProperty);

      if (array.length === 1) {
        groupStep._id = '$_id';
      } else if (index < array.length - 1) {
        groupStep._id = _defineProperty({
          _id: '$_id'
        }, underscoredPath || arrayItem, '$' + nextArray + '._id');
        // Indexes property will not be preserved on the last step
        groupStep.indexes = { $first: '$indexes' };
      } else {
        groupStep._id = '$_id._id';
      }

      result.push({ $group: groupStep });

      if (index < array.length - 1) {
        var nextArrayIndexProperty = 'indexes.' + dotToUnderscore(nextArray);
        result.push({ $sort: _defineProperty({}, nextArrayIndexProperty, 1) });
      }

      if (underscoredPath) {
        result.push({
          $addFields: _defineProperty({}, arrayItem, '$' + underscoredPath)
        }, {
          $project: _defineProperty({}, underscoredPath, 0)
        });
      }
    });

    return result;
  }, []);

  return pipeline;
};

var getResultFilter = function getResultFilter(filter, searchFilter) {
  if (!filter && !searchFilter) return;
  var resultFilter = [];
  filter && resultFilter.push(filter);
  searchFilter && resultFilter.push(searchFilter);
  return resultFilter.length === 1 ? resultFilter[0] : { $and: resultFilter };
};

var treePathsComparator = function treePathsComparator(a, b) {
  if (a.level > b.level) return 1;else if (a.level < b.level) return -1;else return a.property.localeCompare(b.property);
};

var stringIdsToObjectIds = function stringIdsToObjectIds(filterValue) {
  var filterValueType = typeof filterValue === 'undefined' ? 'undefined' : _typeof(filterValue);
  if (filterValue instanceof _mongoose2.default.Types.ObjectId) return filterValue;
  if (filterValueType === 'string') {
    return new _mongoose2.default.Types.ObjectId(filterValue);
  } else if (filterValue !== null && filterValueType === 'object') {
    if (Array.isArray(filterValue)) {
      return filterValue.map(function (value) {
        return new _mongoose2.default.Types.ObjectId(value);
      });
    } else {
      return Object.entries(filterValue).reduce(function (accumulator, _ref2) {
        var _ref3 = _slicedToArray(_ref2, 2),
            key = _ref3[0],
            value = _ref3[1];

        return _extends({}, accumulator, _defineProperty({}, key, stringIdsToObjectIds(value)));
      }, {});
    }
  }
};

var convertFilterIds = function convertFilterIds(pathsMeta, filter) {
  if (!filter) return;
  return Object.entries(filter).reduce(function (accumulator, _ref4) {
    var _ref5 = _slicedToArray(_ref4, 2),
        key = _ref5[0],
        value = _ref5[1];

    var pathIsRef = pathsMeta.some(function (pathMeta) {
      return pathMeta.property === key && pathMeta.type === 'ref';
    });
    if (key.includes('_id') || pathIsRef) {
      var convertedValue = stringIdsToObjectIds(value);
      var nextKey = pathIsRef ? key + '._id' : key;
      return _extends({}, accumulator, _defineProperty({}, nextKey, convertedValue));
    } else {
      return _extends({}, accumulator, _defineProperty({}, key, value));
    }
  }, {});
};

function graphFind() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var skip = options.skip,
      limit = options.limit,
      projection = options.projection,
      sort = options.sort,
      search = options.search;


  var maxDepth = void 0;
  if (options.maxDepth || options.maxDepth === 0) maxDepth = options.maxDepth;else if (this.schema.options.maxDepth || this.schema.options.maxDepth === 0) maxDepth = this.schema.options.maxDepth;else maxDepth = 1;

  var pathsMeta = reduceSchemaRecursive.call(this, this.schema, function (accumulator, property, schema, options, context) {
    var type = void 0;
    if (schema.instance === 'Array') type = 'array';else if (schema.schema) type = 'schema';else if (options.ref) type = 'ref';else type = 'path';
    var newPath = _extends({ property: property, type: type }, context);
    return [].concat(_toConsumableArray(accumulator), [newPath]);
  }, [], { maxDepth: maxDepth, projection: projection }).sort(treePathsComparator);

  var filter = options.filter;

  filter = convertFilterIds(pathsMeta, filter);

  var pipeline = [];

  var searchFilter = searchQueryToFilter(this.schema, search);
  var resultFilter = getResultFilter(filter, searchFilter);

  var joinAndGroupPipeline = getJoinAndGroupPipeline(pathsMeta, projection, maxDepth);
  joinAndGroupPipeline && pipeline.push.apply(pipeline, _toConsumableArray(joinAndGroupPipeline));

  resultFilter && pipeline.push({ $match: resultFilter });
  projection && pipeline.push({ $project: projection });
  sort && pipeline.push({ $sort: sort });
  skip && pipeline.push({ $skip: skip });
  limit && pipeline.push({ $limit: limit });

  return pipeline.length === 0 ? this.find() : this.aggregate(pipeline).allowDiskUse(true).exec();
}

var graphFindPlugin = function graphFindPlugin(schema) {
  schema.static('graphFind', graphFind);
  schema.static('graphFindOne', graphFindOne);
};

exports.default = graphFindPlugin;
//# sourceMappingURL=graphFind.js.map