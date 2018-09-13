import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

export const configureMiddlewares = app => {
    app.use(helmet());
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
};

export const configureErrorHandlers = app => {

    app.use((req, res) => {
        res.status(404).send({ message: req.t && req.t("http:notFound") });
    });

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        res.status(500).send({ message: req.t && req.t("http:internalError"), exception: err.message });
    });
    
};