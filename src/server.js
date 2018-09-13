import { connectDatabase } from './config/database';
import createApp from './config/app';
import createLogger from './config/logger';
import configureI18n from './config/i18n';
import initializeUserManagement from './userManagement/config';

import httpEn from './locales/http/en';
import httpRu from './locales/http/ru';

import roleEn from './locales/model/role/en';

connectDatabase();
const app = createApp(app => {
    configureI18n(app, {
        preload: ["ru"],
        resources: {
            en: {
                http: httpEn,
                "model.role": roleEn
            },
            ru: {
                http: httpRu
            }
        }
    });
    initializeUserManagement(app);
});

const logger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", "Server started at port %s", port);
});