"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _mongoose = require("mongoose");

var _mongoose2 = _interopRequireDefault(_mongoose);

var _mongooseAutopopulate = require("mongoose-autopopulate");

var _mongooseAutopopulate2 = _interopRequireDefault(_mongooseAutopopulate);

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var autopopulateFunction = function autopopulateFunction(opts) {

    var model = _mongoose2.default.model(opts.model);

    var _ref = model && model.schema.options,
        populateProjection = _ref.populateProjection;

    var result = { maxDepth: 1 };
    if (populateProjection) result.select = populateProjection;
    if (!this._fields) return result;

    var selectFieldValue = this._fields[opts.path] || 0;
    var exclusiveSelect = this._fields[Object.keys(this._fields)[0]] === 0;

    if (exclusiveSelect && selectFieldValue || !exclusiveSelect && !selectFieldValue) return false;

    return result;
};

var autopopulate = function autopopulate(schema) {

    (0, _utils.eachPathRecursive)(schema, function (path, schemaType) {
        if (!schemaType.options) return;
        var options = schemaType.options;

        options = Array.isArray(options.type) ? options.type[0] : options;
        if (options.ref && options.type.name === "ObjectId") {
            options.autopopulate = autopopulateFunction;
        }
    });

    (0, _mongooseAutopopulate2.default)(schema);
};

exports.default = autopopulate;
//# sourceMappingURL=autopopulate.js.map