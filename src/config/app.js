import dotenv from 'dotenv';
import express from 'express';
import { configureProcessing, configureErrorHandlers } from '../config/server';
import initializeI18n from '../config/i18n';
import initializeUserManagement from '../userManagement/config';

const app = express();

export const configureApp = app => {

    const env = process.env.NODE_ENV;
    dotenv.config({ path: `./.env${env === "test" ? ".test" : ""}` });

    configureProcessing(app);

    initializeI18n(app);
    initializeUserManagement(app);

    configureErrorHandlers(app);

};

configureApp(app);

export default app;