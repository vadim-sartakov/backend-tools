import i18n from 'i18n';

const initialize = app => {
    i18n.configure({
        locales:['en', 'ru'],
        directory: __dirname + '/../locales',
        defaultLocale: 'en'
    });
    app.use(i18n.init);
};

export default initialize;