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

export default createI18nMiddleware;