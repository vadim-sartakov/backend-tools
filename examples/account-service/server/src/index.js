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
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import GitHubStrategy from "passport-github";
import nodeSSPI from "node-sspi";
import mongooseUniqueValidator from "mongoose-unique-validator";
import loadModels from "./model/loader";

mongoose.plugin(mongooseUniqueValidator);
mongoose.plugin(autopopulatePlugin);
mongoose.plugin(securityPlugin);
mongoose.plugin(i18nPlugin);

loadModels();

passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: "test"
}, (payload, cb) => {
    cb(undefined, { ...payload.user });
}));

const oAuth2VerifyCallback = (accessToken, refreshToken, profile, cb) => (async () => {

    const User = mongoose.model("User");
    const OAuth2Account = mongoose.model("OAuth2Account");

    let account = await OAuth2Account.findOne({ provider: profile.provider, profileId: profile.id });
    if (account) return cb(undefined, account.user._doc);

    let user = await new User({ username: profile.username, blocked: true, roles: ["USER"] }).save();
    account = await new OAuth2Account({ user, provider: profile.provider, profileId: profile.id }).save();

    user.blocked = false;
    user = await user.save();
    cb(null, user._doc);

})().catch(err => cb(err));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: "http://localhost:8080/login/github/auth"
}, oAuth2VerifyCallback));

const app = express();
const i18n = createI18n();

app.disable('x-powered-by');
app.use(generalMiddlewares);

app.use(passport.initialize());

const sendToken = (req, res) => {
    const token = jwt.sign({ user: { id: req.user._id, roles: req.user.roles } }, "test", { expiresIn: "10m" });
    res.json({ token });
};

app.get("/login/github", passport.authenticate("github"));
app.get("/login/github/auth", passport.authenticate("github", { session: false }), sendToken);

app.get("/login/windows", (req, res, next) => {

    const nodeSSPIInstance = new nodeSSPI({ retrieveGroups: true });
    nodeSSPIInstance.authenticate(req, res, err => (async () => {
        
        if (res.finished || res.locals.user) return;
        if (err) return next(err);

        const User = mongoose.model("User");
        const WindowsAccount = mongoose.model("WindowsAccount");

        let account = await WindowsAccount.findOne({ userSid: req.connection.userSid });
        if (!account) {

            let user = await new User({ username: req.connection.user, blocked: true, roles: ["USER"] }).save();
            account = await new WindowsAccount({
                user,
                confirmedAt: new Date(),
                username: req.connection.user,
                userSid: req.connection.userSid,
                groups: req.connection.userGroups
            }).save();

            user.blocked = false;
            user = await user.save();

        }

        req.user = account.user._doc;
        sendToken(req, res);

        next();

    })().catch(next));

});

app.all("*", passport.authenticate("jwt", { session: false }));

app.all("*", (req, res, next) => {
    if (!req.user.roles.indexOf("USER") === -1) throw new AccessDeniedError();
    next();
});

app.get("/me", (req, res) => {
    res.json(req.user);
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