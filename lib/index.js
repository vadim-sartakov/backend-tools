"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _logger = require("./utils/logger");

Object.defineProperty(exports, "createLogger", {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_logger).default;
  }
});

var _http = require("./utils/http");

Object.keys(_http).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _http[key];
    }
  });
});

var _middleware = require("./middleware");

Object.keys(_middleware).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _middleware[key];
    }
  });
});

var _crud = require("./router/crud");

Object.defineProperty(exports, "crudRouter", {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_crud).default;
  }
});

var _MongooseCrudModel = require("./model/MongooseCrudModel");

Object.defineProperty(exports, "MongooseCrudModel", {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_MongooseCrudModel).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
//# sourceMappingURL=index.js.map