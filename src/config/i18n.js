import i18next from 'i18next';
import i18nmiddleware, { LanguageDetector } from 'i18next-express-middleware';
import httpEn from '../locales/http/en';

const configureI18n = (app, opts = { preload: [] }) => {

    const enResources = (opts.resources && opts.resources.en) || {};

    const i18n = i18next.createInstance();
    i18n.use(LanguageDetector).init({
        preload: ["en", ...opts.preload],
        fallbackLng: "en",
        resources: {
            en: {
                http: httpEn,
                ...enResources
            },
            ...opts.resources
        }
    });
    app.use(i18nmiddleware.handle(i18n));

};

export default configureI18n;