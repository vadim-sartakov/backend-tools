import express from 'express';
import { configureMiddlewares, configureErrorHandlers } from '../config/server';
import initializeUserManagement from '../userManagement/config';

const createApp = () => {

    const app = express();

    configureMiddlewares(app);
    initializeUserManagement(app);
    configureErrorHandlers(app);

    return app;

};

export default createApp;