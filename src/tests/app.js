import env from '../config/env'; // eslint-disable-line no-unused-vars
import { connectDatabase } from '../config/database'; // eslint-disable-line no-unused-vars
import mongoose from 'mongoose';
import express from 'express';
import crudRouter, { createRouteMap } from '../controller/crudController';
import generalMiddlewares from '../middleware/general';
import { createI18n, createI18nMiddleware } from '../middleware/i18n';
import crudValidationMiddleware from '../middleware/crud';
import httpMiddlewares from '../middleware/http';
import { userTranslations } from './model/user';

let portCounter = 6000;

const createApp = (user, crudOptions) => {

    const User = mongoose.model("User");
    const app = express();

    const i18n = createI18n();
    i18n.addResourceBundle("en", "model.User", userTranslations);

    app.use(generalMiddlewares);
    app.use(createI18nMiddleware(i18n));
    app.use((req, res, next) => {
        res.locals.user = user;
        next();
    });
    app.use("/users", crudRouter(User.modelName, createRouteMap(User, crudOptions)));
    app.use(crudValidationMiddleware);
    app.use(httpMiddlewares);

    const server = app.listen(portCounter++);

    return server;

};

export default createApp;