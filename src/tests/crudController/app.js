import env from '../../config/env'; // eslint-disable-line no-unused-vars
import { connectDatabase } from '../../config/database'; // eslint-disable-line no-unused-vars
import express from 'express';
import crudRouter from '../../controller/crudController';
import generalMiddlewares from '../../middleware/general';
import { createI18n, createI18nMiddleware } from '../../middleware/i18n';
import crudValidationMiddleware from '../../middleware/crud';
import httpMiddlewares from '../../middleware/http';

import User, { userTranslations } from './user';

const i18n = createI18n();
i18n.addResourceBundle("en", "model.User", userTranslations);

const app = express();

app.use(generalMiddlewares);
app.use(createI18nMiddleware(i18n));
app.use("/users", crudRouter(User));
app.use(crudValidationMiddleware);
app.use(httpMiddlewares);

export default app;