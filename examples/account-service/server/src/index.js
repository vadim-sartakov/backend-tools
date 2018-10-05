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
import nodeSSPI from "node-sspi";
import mongooseUniqueValidator from "mongoose-unique-validator";
import loadModels from "./model/loader";

mongoose.plugin(mongooseUniqueValidator);
mongoose.plugin(autopopulatePlugin);
mongoose.plugin(securityPlugin);
mongoose.plugin(i18nPlugin);

loadModels();

const app = express();
const i18n = createI18n();

app.disable('x-powered-by');
app.use(generalMiddlewares);

app.use((req, res, next) => {

    if (res.locals.user) return;

    const nodeSSPIInstance = new nodeSSPI({ retrieveGroups: true });
    nodeSSPIInstance.authenticate(req, res, err => (async () => {
        
        if (res.finished || res.locals.user) return;
        if (err) return next(err);

        const User = mongoose.model("User");
        const WindowsAccount = mongoose.model("WindowsAccount");

        let user = await User.findOne({ username: req.connection.user });
        let account = await WindowsAccount.findOne({ userSid: req.connection.userSid });

        if (!user) {
            user = await new User({ username: req.connection.user, blocked: true, roles: ["USER"] }).save();
            user.blocked = false;
            user = await user.save();
        }

        if (!account) {
            account = await new WindowsAccount({
                user,
                confirmedAt: new Date(),
                username: req.connection.user,
                userSid: req.connection.userSid,
                groups: req.connection.userGroups
            }).save();
        }

        res.locals.user = { ...user._doc, account };
        next();

    })().catch(next));

});

app.get("*", (req, res, next) => {
    if (res.locals.user) res.locals.permitted = true;
    next();
});

app.all("*", (req, res, next) => {
    if (!res.locals.permitted) throw new AccessDeniedError();
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