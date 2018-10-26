import fs from "fs";
import {
    env, // eslint-disable-line no-unused-vars
    createLogger,
    createI18n,
    createI18nMiddleware,
    
    commonMiddlewares,
    notFoundMiddleware,
    serverErrorMiddleware,
    
    autopopulatePlugin,
    securityPlugin,
    i18nPlugin,

    crudRouter
} from "backend-tools";  
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import connectMongo from "connect-mongo";
import axios from "axios";
import OAuthServer from "express-oauth-server";
import { MongoModel, JwtModel } from "./model/oauth2";
import loadModels from "./model/loader";

import { githubAuthRouter } from "./router/auth";
import { winAuthenticate, localAuthenticate, authSession, logInSession, permit } from "./middleware/auth";

mongoose.plugin(autopopulatePlugin);
mongoose.plugin(securityPlugin);
mongoose.plugin(i18nPlugin);

loadModels();

const mongooseLogger = createLogger("mongoose");
mongoose.set("debug", (collection, method, query) => {
    mongooseLogger.debug("%s.%s(%o)", collection, method, query);
});
mongoose.connect(`${process.env.DB_URL}`, { useNewUrlParser: true, bufferCommands: false });

const app = express();
const i18n = createI18n();

const PRIVATE_KEY = fs.readFileSync("keys/private.pem");
const PUBLIC_KEY = fs.readFileSync("keys/public.pem");

// In seconds
const ACCESS_TOKEN_LIFETIME = 60 * 60;
const REFRESH_TOKEN_LIFETIME = 60 * 60 * 5;

app.oauth = new OAuthServer({
    model: new MongoModel({
        Token: mongoose.model("Token"),
        User: mongoose.model("User"),
        Client: mongoose.model("Client"),
        AuthorizationCode: mongoose.model("AuthorizationCode")
    }),
    /*model: new JwtModel({
        Token: mongoose.model("Token"),
        User: mongoose.model("User"),
        Client: mongoose.model("Client"),
        AuthorizationCode: mongoose.model("AuthorizationCode")
    },
    { private: PRIVATE_KEY, public: PUBLIC_KEY },
    { algorithm: "RS256" },
    { accessToken: ACCESS_TOKEN_LIFETIME, refreshToken: REFRESH_TOKEN_LIFETIME }),*/
    useErrorHandler: true,
    accessTokenLifetime: ACCESS_TOKEN_LIFETIME,
    refreshTokenLifetime: REFRESH_TOKEN_LIFETIME
});

app.disable('x-powered-by');
app.use(commonMiddlewares);

const MongoStore = connectMongo(session);

app.use(session({
    secret: "test",
    name: "session",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: mongoose.connection,
        stringify: false, 
        unserialize: async session => {
            const user = await mongoose.connection.db.collection("users").findOne({ _id: session.user }, { projection: { password: 0 } });
            session.user = user;
            return session;
        }
    })
}));

app.use(authSession());

app.post("/oauth/token", app.oauth.token());
app.post("/oauth/authorize", app.oauth.authorize({
    authenticateHandler: { handle: (req, res) => res.locals.user }
}));

app.post("/login", localAuthenticate());
app.use("/login/github", githubAuthRouter(process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET, axios));
app.get("/login/windows", winAuthenticate());

app.use((req, res, next) => {
    const oAuth2Authenticate = app.oauth.authenticate();
    return res.locals.user ? next() : oAuth2Authenticate(req, res, next);
});
app.use((req, res, next) => {
    if (res.locals.oauth) res.locals.user = res.locals.oauth.token.user;
    next();
});

app.get("/me", permit("ALL"), (req, res) => res.json(res.locals.user));

app.use(createI18nMiddleware(i18n));
app.use("/users", crudRouter(mongoose.model("User")));
app.use("/clients", crudRouter(mongoose.model("Client")));
app.use("/sessions", crudRouter(mongoose.model("Session")));

const httpLogger = createLogger("http");
app.use(notFoundMiddleware((message, ...args) => httpLogger.warn(message, ...args)));
app.use(serverErrorMiddleware(err => httpLogger.error("%s \n %s", err.message, err.stack)));

const serverLogger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    serverLogger.info("Server started at port %s", port);
});