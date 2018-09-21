import env from './config/env';  // eslint-disable-line no-unused-vars
import express from 'express';
import { connectDatabase } from './config/database';
import createLogger from './config/logger';
import { crudRouter } from './controller/crudController';

import generalMiddlewares from './middleware/general';
import { createI18n, createI18nMiddleware } from './middleware/i18n';
import httpMiddlewares from './middleware/http';

import httpRu from './locales/http/ru';

connectDatabase();

const i18n = createI18n();
i18n.addResourceBundle("ru", "http", httpRu);

const app = express();
app.disable('x-powered-by');
app.use(generalMiddlewares);
app.use(createI18nMiddleware(i18n));
//app.use("/users", crudRouter(User));
app.use(httpMiddlewares);

const logger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", "Server started at port %s", port);
});