import i18n from 'i18n';

i18n.configure({
    locales:['en', 'ru'],
    directory: __dirname + '/../locales',
    defaultLocale: 'en',
    objectNotation: true
});

export default i18n.init;