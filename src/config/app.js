import dotenv from 'dotenv';
import { configureProcessing, configureErrorHandlers } from '../config/server';
import { connectDatabase } from '../config/database';
import initializeI18n from '../config/i18n';
import initializeUserManagement from '../userManagement/config';

dotenv.config({ path: `./.env.${process.env.NODE_ENV || ""}` });

const configureApp = app => {

    configureProcessing(app);

    connectDatabase();
    initializeI18n(app);
    initializeUserManagement(app);

    configureErrorHandlers(app);

};

export default configureApp;