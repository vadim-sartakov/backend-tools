import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import i18n from '../config/i18n';

export const configureMiddlewares = app => {
    app.disable('x-powered-by');
    app.use(helmet());
    app.use(cookieParser());
    app.use(i18n);
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
};

export const configureErrorHandlers = app => {

    app.use((req, res) => {
        res.status(404).send({ message: req.__("http.notFound") });
    });

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        res.status(500).send({ message: req.__("http.internalError"), exception: err.message });
    });
    
};