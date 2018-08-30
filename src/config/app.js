import dotenv from 'dotenv';
import express from 'express';
import { configureMiddlewares, configureErrorHandlers } from '../config/server';
import initializeUserManagement from '../userManagement/config';

const app = express();

export const configureApp = app => {

    const env = process.env.NODE_ENV;
    dotenv.config({ path: `./.env${env === "test" ? ".test" : ""}` });

    configureMiddlewares(app);
    initializeUserManagement(app);
    configureErrorHandlers(app);

};

configureApp(app);

export default app;