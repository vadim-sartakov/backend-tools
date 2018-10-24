import fs from "fs";
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
import session from "express-session";
import connectRedis from "connect-redis";
import mongoose from "mongoose";
import axios from "axios";
import OAuthServer from "express-oauth-server";
import MongooseModel from "./model/oauth2";
import loadModels from "./model/loader";

import { winAuthRouter, githubAuthRouter } from "./router/auth";
import { authSession, logInSession, authJwt, issueJwt, permit } from "./middleware/auth";

mongoose.plugin(autopopulatePlugin);
mongoose.plugin(securityPlugin);
mongoose.plugin(i18nPlugin);

loadModels();

const app = express();
const i18n = createI18n();

app.oauth = new OAuthServer({
    model: new MongooseModel({
        Token: mongoose.model("Token"),
        User: mongoose.model("User"),
        Client: mongoose.model("Client"),
        AuthorizationCode: mongoose.model("AuthorizationCode")
    }),
    useErrorHandler: true
});

app.disable('x-powered-by');
app.use(generalMiddlewares);

const PRIVATE_KEY = fs.readFileSync("keys/private.pem");
const PUBLIC_KEY = fs.readFileSync("keys/public.pem");
const JWT_EXPIRES_IN = "1h";

const RedisStore = connectRedis(session);

app.use(session({
    secret: "test",
    name: "session",
    resave: false,
    store: new RedisStore()
}));

app.use(authSession());
//app.use(authJwt(PUBLIC_KEY));

app.post("/oauth/token", app.oauth.token());
app.post("/oauth/authorize", app.oauth.authorize({
    authenticateHandler: {
        handle: req => req.session.user
    }
}));

app.use("/login/github", githubAuthRouter(process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET, axios));
app.use("/login/windows", winAuthRouter());
app.use("/login/*", logInSession(), issueJwt(PRIVATE_KEY, { expiresIn: JWT_EXPIRES_IN, algorithm: "RS256" }));

app.use(permit(["USER", "ADMIN"]));

app.use(app.oauth.authenticate(), (req, res, next) => {
    res.locals.user = res.locals.oauth.token.user;
    next();
});
app.get("/me", (req, res) => res.json(res.locals.user));

app.use(createI18nMiddleware(i18n));
app.use("/users", crudRouter(mongoose.model("User")));
app.use("/clients", crudRouter(mongoose.model("Client")));

const httpLogger = createLogger("http");
app.use(notFoundMiddleware((message, ...args) => httpLogger.warn(message, ...args)));
app.use(serverErrorMiddleware(err => httpLogger.error("%s \n %s", err.message, err.stack)));

const mongooseLogger = createLogger("mongoose");
mongoose.set("debug", (collection, method, query) => {
    mongooseLogger.debug("%s.%s(%o)", collection, method, query);
});
mongoose.connect(`${process.env.DB_URL}`, { useNewUrlParser: true, bufferCommands: false });

const serverLogger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    serverLogger.info("Server started at port %s", port);
});