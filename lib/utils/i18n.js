'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createI18nMiddleware = exports.createI18n = undefined;

var _i18next = require('i18next');

var _i18next2 = _interopRequireDefault(_i18next);

var _i18nextExpressMiddleware = require('i18next-express-middleware');

var _i18nextExpressMiddleware2 = _interopRequireDefault(_i18nextExpressMiddleware);

var _en = require('../locale/http/en');

var _en2 = _interopRequireDefault(_en);

var _en3 = require('../locale/validation/en');

var _en4 = _interopRequireDefault(_en3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var createI18n = exports.createI18n = function createI18n() {
    var defaultLang = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "en";


    var i18n = _i18next2.default.createInstance();
    i18n.use(_i18nextExpressMiddleware.LanguageDetector).init({
        preload: [defaultLang],
        fallbackLng: defaultLang,
        resources: _defineProperty({}, defaultLang, { http: _en2.default, validation: _en4.default })
    });

    return i18n;
};

var createI18nMiddleware = exports.createI18nMiddleware = function createI18nMiddleware(i18n) {
    return _i18nextExpressMiddleware2.default.handle(i18n);
};

exports.default = createI18nMiddleware;
//# sourceMappingURL=i18n.js.map