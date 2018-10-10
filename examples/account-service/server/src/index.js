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

    crudRouter,
    AccessDeniedError
} from "backend-tools";  
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import jwtMiddleware from "express-jwt";
import ClientOAuth2 from "client-oauth2";
import nodeSSPI from "node-sspi";
import loadModels from "./model/loader";

mongoose.plugin(autopopulatePlugin);
mongoose.plugin(securityPlugin);
mongoose.plugin(i18nPlugin);

loadModels();

const authenticateOAuth2Client = async (req, res, profile) => {
    const User = mongoose.model("User");
    let user = await User.findOne({ "accounts.oAuth2.provider": profile.provider, "accounts.oAuth2.profileId": profile.id });
    if (!user) {
        const account = { provider: profile.provider, profileId: profile.id, username: profile.username };
        user = await new User({ username: profile.username, roles: ["USER"], accounts: { oAuth2: [account] } }).save();
    }
    res.locals.loggedInUser = user._doc;
    res.locals.account = { type: profile.provider, accessToken: profile.accessToken };
};

const app = express();
const i18n = createI18n();

app.disable('x-powered-by');
app.use(generalMiddlewares);

app.use(jwtMiddleware({ secret: "test", resultProperty: "locals.user", credentialsRequired: false }));

const githubAuth = new ClientOAuth2({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    accessTokenUri: 'https://github.com/login/oauth/access_token',
    authorizationUri: 'https://github.com/login/oauth/authorize',
    redirectUri: 'http://localhost:8080/login/github/auth',
});

const issueJwt = (req, res) => {

    let { user, loggedInUser, account } = res.locals;
    if (user && user.id === loggedInUser._id) {
        user.accounts.push(account);
    } else {
        user = { id: loggedInUser._id, roles: loggedInUser.roles, accounts: [account] };
    }

    const token = jwt.sign(user, "test", { expiresIn: "10m" });
    res.json({ token });

};

app.get("/login/github", (req, res) => {
    const uri = githubAuth.code.getUri();
    res.redirect(uri);
});
app.get("/login/github/auth", (req, res, next) => {
    (async () => {
        const user = await githubAuth.code.getToken(req.originalUrl);
        await authenticateOAuth2Client(req, res, user);
    })().catch(next);
}, issueJwt);

app.get("/login/windows", (req, res, next) => {

    const nodeSSPIInstance = new nodeSSPI();
    nodeSSPIInstance.authenticate(req, res, err => {
        
        (async () => {
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
        })().catch(next);

    });

}, issueJwt);

app.all("*", (req, res, next) => {
    if (!res.locals.user || res.locals.user.roles.indexOf("USER") === -1) throw new AccessDeniedError();
    next();
});

app.get("/me", (req, res) => {
    res.json(res.locals.user);
});

app.use(createI18nMiddleware(i18n));
app.use("/users", crudRouter(mongoose.model("User")));
app.use(httpMiddlewares);

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