import express from 'express';
import initEnv from '../config/env';
import { configureMiddlewares, configureErrorHandlers } from '../config/server';

initEnv();

const createApp = middlewareCallback => {

    const app = express();

    app.disable('x-powered-by');
    configureMiddlewares(app);
    middlewareCallback && middlewareCallback(app);
    configureErrorHandlers(app);

    return app;

};

export default createApp;