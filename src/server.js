import express from 'express';
import dotenv from 'dotenv';
import { configureProcessing, configureErrorHandlers } from './config/server';
import initializeDatabase from './config/database';
import initializeI18n from './config/i18n';
import initializeUserManagement from './userManagement/config';

dotenv.config({ path: `./.env${process.env.NODE_ENV === "test" ? "test" : ""}` });

const port = process.env.PORT || 8080;
export const app = express();

configureProcessing(app);

initializeDatabase();
initializeI18n(app);
initializeUserManagement(app);

configureErrorHandlers(app);

const server = app.listen(port, () => {
    var port = server.address().port;
    console.log("Server started at port %s", port);
});