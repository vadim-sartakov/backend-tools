import helmet from 'helmet';
import bodyParser from 'body-parser';

export const configureProcessing = app => {
    app.disable('x-powered-by');
    app.use(helmet());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());    
};

export const configureErrorHandlers = app => {

    app.use((req, res) => {
        res.status(404).send({ message: "Not found" });
    });

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        res.status(500).send({ message: "Something went wrong", exception: err.message });
    });
    
};