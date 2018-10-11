import {
    env, // eslint-disable-line no-unused-vars
    createLogger,
    createI18n,
    createI18nMiddleware,
    notFoundMiddleware,
    serverErrorMiddleware,
    generalMiddlewares,
    
    autopopulatePlugin,
    securityPlugin,
    i18nPlugin,

    crudRouter,
    AccessDeniedError
} from "backend-tools";  
import crypto from "crypto";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import ClientOAuth2 from "client-oauth2";
import axios from "axios";
import nodeSSPI from "node-sspi";
import loadModels from "./model/loader";

mongoose.plugin(autopopulatePlugin);
mongoose.plugin(securityPlugin);
mongoose.plugin(i18nPlugin);

loadModels();

const asyncMiddleware = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const app = express();
const i18n = createI18n();

app.disable('x-powered-by');
app.use(generalMiddlewares);

app.use((req, res, next) => {
    if (!req.headers.authorization) return next();
    const [schema, token] = req.headers.authorization.split(" ");
    if ((!token) || schema.toLowerCase() !== "bearer") return next();
    const payload = jwt.verify(token, "test");
    res.locals.user = payload;
    next();
});

const oAuth2Redirect = clientOAuth2 => (req, res) => {
    const state = crypto.randomBytes(10).toString("hex");
    res.cookie("state", state, { httpOnly: true });
    const uri = clientOAuth2.code.getUri({ state });
    res.redirect(uri);
};

const authenticateOAuth2Client = async (req, res, token, profile) => {
    const User = mongoose.model("User");
    let user = await User.findOne({ "accounts.oAuth2.provider": profile.provider, "accounts.oAuth2.profileId": profile.id });
    if (!user) {
        const account = { provider: profile.provider, profileId: profile.id, username: profile.username };
        user = await new User({ username: profile.username, roles: ["USER"], accounts: { oAuth2: [account] } }).save();
    }
    res.locals.loggedInUser = user;
    res.locals.account = { type: profile.provider, accessToken: token.accessToken };
    if (token.refreshToken) res.locals.account.refreshToken = token.refreshToken;
};

const findOrCreateUser = async ({ userFindQuery, accountType, account, username }) => {
    const User = mongoose.model("User");
    let user = await User.findOne(userFindQuery);
    if (!user) {
        user = await new User({
            username,
            roles: ["USER"],
            accounts: { [accountType]: [account] }
        }).save();
    }
    return user;
};

const oAuth2Authenticate = (clientOAuth2, userCallback) => asyncMiddleware(async (req, res, next) => {
    const token = await clientOAuth2.code.getToken(req.originalUrl);
    const state = req.cookies.state;
    if (req.query.state !== state) throw new Error("States are not equal");
    res.clearCookie("state");
    const request = token.sign({ method: "GET", url: clientOAuth2.options.userInfoUri });
    const profile = await axios.request(request);
    await authenticateOAuth2Client(req, res, token, { provider: "github", id: profile.data.id, username: profile.data.login });
    next();
});

const issueJwt = (req, res) => {

    let { user, loggedInUser, account } = res.locals;
    if (user && user.id === loggedInUser.id) {
        user.accounts.push(account);
    } else {
        user = { id: loggedInUser.id, roles: loggedInUser.roles, accounts: [account] };
    }

    const token = jwt.sign(user, "test", { expiresIn: "10m" });
    res.json({ token });

};

const githubAuth = new ClientOAuth2({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    accessTokenUri: "https://github.com/login/oauth/access_token",
    authorizationUri: "https://github.com/login/oauth/authorize",
    redirectUri: "http://localhost:8080/login/github/auth",
    userInfoUri: "https://api.github.com/user",
    provider: "github"
});
app.get("/login/github", oAuth2Redirect(githubAuth));
app.get("/login/github/auth", asyncMiddleware(async (req, res, next) => {
    const token = await githubAuth.code.getToken(req.originalUrl);
    const state = req.cookies.state;
    if (req.query.state !== state) throw new Error("States are not equal");
    res.clearCookie("state");
    const request = token.sign({ method: "GET", url: "https://api.github.com/user" });
    const profile = await axios.request(request);
    await authenticateOAuth2Client(req, res, token, { provider: "github", id: profile.data.id, username: profile.data.login });
    next();
}), issueJwt);

app.get("/login/windows", (req, res, next) => {

    if (req.headers.authorization && req.headers.authorization.split(" ")[0] !== "NTLM") { 
        throw new Error("Request can't contain authorization header");
    }

    const nodeSSPIInstance = new nodeSSPI();
    nodeSSPIInstance.authenticate(req, res, err => (async () => {

        if (res.finished || res.locals.user) return;
        if (err) return next(err);

        const User = mongoose.model("User");

        let user = await User.findOne({ "accounts.windows.userSid": req.connection.userSid });
        if (!user) {
            const account = {
                confirmedAt: new Date(),
                username: req.connection.user,
                userSid: req.connection.userSid
            };
            user = await new User({
                username: req.connection.user,
                roles: ["USER"],
                accounts: { windows: [account] }
            }).save();
        }

        res.locals.loggedInUser = user._doc;
        res.locals.account = { type: "windows", username: req.connection.user, userSid: req.connection.userSid };
        next();

    })().catch(next));

}, issueJwt);

app.use((req, res, next) => {
    if (!res.locals.user || res.locals.user.roles.indexOf("USER") === -1) throw new AccessDeniedError();
    next();
});

app.get("/me", (req, res) => {
    res.json(res.locals.user);
});

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

const logger = createLogger("server");
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    var port = server.address().port;
    logger.log("info", "Server started at port %s", port);
});