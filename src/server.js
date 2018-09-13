import express from 'express';
import env from './config/env';  // eslint-disable-line no-unused-vars
import { connectDatabase } from './config/database';
import createLogger from './config/logger';
import { crudRouter } from './controller/crudController';

import generalMiddlewares from './middleware/general';
import i18nMiddleware from './middleware/i18n';
import httpMiddlewares from './middleware/http';

import httpEn from './locales/http/en';
import httpRu from './locales/http/ru';
import roleEn from './locales/model/role/en';

connectDatabase();

const app = express();
app.use(generalMiddlewares);
app.use(i18nMiddleware({
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
}));
//app.use("/users", crudRouter(User));
app.use(httpMiddlewares);

const logger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", "Server started at port %s", port);
});