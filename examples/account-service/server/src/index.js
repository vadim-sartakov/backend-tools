import {
    env, // eslint-disable-line no-unused-vars
    createLogger,
    createI18n,
    createI18nMiddleware,
    
    generalMiddlewares,
    notFoundMiddleware,
    serverErrorMiddleware,
    
    autopopulatePlugin,
    securityPlugin,
    i18nPlugin,

    crudRouter
} from "backend-tools";  
import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import loadModels from "./model/loader";

import { winAuthRouter, githubAuthRouter } from "./router/auth";
import { authJwt, issueJwt, permit } from "./middleware/auth";

mongoose.plugin(autopopulatePlugin);
mongoose.plugin(securityPlugin);
mongoose.plugin(i18nPlugin);

loadModels();

const app = express();
const i18n = createI18n();

app.disable('x-powered-by');
app.use(generalMiddlewares);

const JWT_SECRET = "test";
const JWT_EXPIRES_IN = "1h";

app.use(authJwt(JWT_SECRET));

app.use("/login/github", githubAuthRouter(process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET, axios));
app.use("/login/windows", winAuthRouter());
app.use("/login/*", issueJwt(JWT_SECRET, JWT_EXPIRES_IN));

app.use(permit(["USER", "ADMIN"]));

app.get("/me", (req, res) => res.json(res.locals.user));

app.use(createI18nMiddleware(i18n));
app.use("/users", crudRouter(mongoose.model("User")));

const httpLogger = createLogger("http");
app.use(notFoundMiddleware((message, ...args) => httpLogger.warn(message, ...args)));
app.use(serverErrorMiddleware(err => httpLogger.error("%s \n %s", err.message, err.stack)));

const mongooseLogger = createLogger("mongoose");
mongoose.set("debug", (collection, method, query, doc, opts) => {
    mongooseLogger.debug("%s.%s(%o) doc: %O, opts: %O", collection, method, query, doc, opts);
});
mongoose.connect(`${process.env.DB_URL}`, { useNewUrlParser: true, bufferCommands: false });

const serverLogger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    serverLogger.info("Server started at port %s", port);
});