import {
    env, // eslint-disable-line no-unused-vars
    createLogger,
    crudRouter,
    generalMiddlewares,
    createI18n,
    createI18nMiddleware,
    httpMiddlewares
} from 'backend-tools';  
import express from 'express';

const i18n = createI18n();
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