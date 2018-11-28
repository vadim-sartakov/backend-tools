'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var getCurrentUrl = exports.getCurrentUrl = function getCurrentUrl(req) {
  return req.protocol + '://' + req.get('host') + req.baseUrl;
};
var asyncMiddleware = exports.asyncMiddleware = function asyncMiddleware(fn, errHandler) {
  return function (req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(errHandler && function (err) {
      return errHandler(err, req, res, next);
    } || next);
  };
};
//# sourceMappingURL=http.js.map