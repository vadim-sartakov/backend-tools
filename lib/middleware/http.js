"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var notFound = exports.notFound = function notFound(loggerCallback) {
    return function (req, res) {
        loggerCallback && loggerCallback("%s requested non-existed resource %s", req.ip, req.originalUrl);
        res.status(404).send({ message: req.t && req.t("http:notFound") });
    };
};

var internalError = exports.internalError = function internalError(loggerCallback) {
    return function (err, req, res, next) {
        // eslint-disable-line no-unused-vars
        loggerCallback && loggerCallback(err);
        res.status(500).send({ message: req.t && req.t("http:internalError"), exception: err.message });
    };
};
//# sourceMappingURL=http.js.map