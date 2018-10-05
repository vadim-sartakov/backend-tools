import {
    env, // eslint-disable-line no-unused-vars
    createLogger,
    createI18n,
    createI18nMiddleware,
    httpMiddlewares,
    generalMiddlewares,
    
    autopopulatePlugin,
    securityPlugin,
    i18nPlugin,

    crudRouter
} from "backend-tools";  
import express from "express";
import mongoose from "mongoose";
import mongooseUniqueValidator from "mongoose-unique-validator";
import loadModels from "./model/loader";

mongoose.plugin(mongooseUniqueValidator);
mongoose.plugin(autopopulatePlugin);
mongoose.plugin(securityPlugin);
mongoose.plugin(i18nPlugin);

loadModels();

const User = mongoose.model("User");

const app = express();
const i18n = createI18n();

app.disable('x-powered-by');
app.use(generalMiddlewares);
app.use(createI18nMiddleware(i18n));
app.use("/users", crudRouter(User));
app.use(httpMiddlewares);

const mongooseLogger = createLogger("mongoose");
mongoose.set("debug", (collection, method, query, doc) => {
    mongooseLogger.debug("%s.%s(%o)-%s", collection, method, query, doc);
});
mongoose.connect(`${process.env.DB_URL}`, { useNewUrlParser: true, bufferCommands: false });

const logger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", "Server started at port %s", port);
});