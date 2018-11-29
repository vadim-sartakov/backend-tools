import i18next from 'i18next';
import i18nMiddleware, { LanguageDetector } from 'i18next-express-middleware';
import http from '../locale/http/en';
import validation from '../locale/validation/en';

export const createI18n = (defaultLang = "en") => {

    const i18n = i18next.createInstance();
    i18n.use(LanguageDetector).init({
        preload: [defaultLang],
        fallbackLng: defaultLang,
        resources: {
            [defaultLang]: { http, validation }
        }
    });
    
    return i18n;

};

export const createI18nMiddleware = i18n => i18nMiddleware.handle(i18n);

/**
 * Translates provided response object. "errors" property also
 * @param {Object} i18n - i18next instance
 * @param {Object} response - response body object to translate
 */
export const translate = (i18n, response) => {

    const translated = {};

    translated.message = i18n.t(response.message);
    if (response.errors) {
        translated.errors = Object.keys(response.errors).reduce((prev, cur) => {}, {});
    }

    return translated;

};

export default createI18nMiddleware;