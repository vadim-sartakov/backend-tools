import express from 'express';
import { configureProcessing, configureErrorHandlers } from './config/server';
import initializeDatabase from './config/database';
import initializeI18n from './config/i18n';
import initializeUserManagement from './userManagement/config';

const port = 8080;
const app = express();

configureProcessing(app);

initializeDatabase();
initializeI18n(app);
initializeUserManagement(app);

configureErrorHandlers(app);

const server = app.listen(port, () => {
    var host = server.address().address;
    var port = server.address().port;
    console.log("App listening at http://%s:%s", host, port);
});