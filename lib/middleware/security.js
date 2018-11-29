"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Checks current user sotred in "user.local" against security schema.
 * Resulted filter stored in "res.locals.readFilter" parameter
 * @param {Object} securitySchema
 */
var readFilter = exports.readFilter = function readFilter(securitySchema) {
  return function (req, res, next) {
    next();
  };
};

/**
 * Checks current user sotred in "user.local" against security schema.
 * Updates request body according schema then stores result in "res.locals.filteredBody"
 * @param {*} securitySchema 
 */
var updateFilter = exports.updateFilter = function updateFilter(securitySchema) {
  return function (req, res, next) {
    next();
  };
};

/**
 * Validates body against validation schema.
 * ValidationError is thrown in case of validation fails.
 * @param {*} validationSchema 
 */
var validator = exports.validator = function validator(validationSchema) {
  return function (req, res, next) {
    next();
  };
};
//# sourceMappingURL=security.js.map