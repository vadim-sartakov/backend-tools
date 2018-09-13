import i18next from 'i18next';
import i18nMiddleware, { LanguageDetector } from 'i18next-express-middleware';
import httpEn from '../locales/http/en';

export const createI18n = () => {

    const i18n = i18next.createInstance();
    i18n.use(LanguageDetector).init({
        preload: ["en"],
        fallbackLng: "en",
        resources: {
            en: { http: httpEn }
        }
    });
    
    return i18n;

};

export const createI18nMiddleware = i18n => i18nMiddleware.handle(i18n);

export default createI18nMiddleware;