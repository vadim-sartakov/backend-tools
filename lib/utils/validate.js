"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.validate = undefined;

var _error = require("../error");

var validate = exports.validate = function validate(validationSchema) {

    var validationError = new _error.ValidationError();
    validationError.errors = {};

    return validationError;
};
//# sourceMappingURL=validate.js.map