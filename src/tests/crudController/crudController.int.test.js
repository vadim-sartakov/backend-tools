import express from 'express';
import request from 'supertest';
import env from '../../config/env'; // eslint-disable-line no-unused-vars
import { connectDatabase, disconnectDatabase } from '../../config/database';
import crudRouter from '../../controller/crudController';

import generalMiddlewares from '../../middleware/general';
import { createI18n, createI18nMiddleware } from '../../middleware/i18n';
import crudValidationMiddleware from '../../middleware/crud';
import httpMiddlewares from '../../middleware/http';

import User, { userTranslations } from './user';

const app = express();

const i18n = createI18n();
i18n.addResourceBundle("en", "model.User", userTranslations);

app.use(generalMiddlewares);
app.use(createI18nMiddleware(i18n));
app.use("/users", crudRouter(User));
app.use(crudValidationMiddleware);
app.use(httpMiddlewares);

describe('Crud controller integration tests', () => {

    const notFoundMessage = { message: 'Not found' };
    const doc = { firstName: "Bill", lastName: "Gates" };
    const diff = { firstName: "Steve" };

    beforeAll(() => {
        connectDatabase();
    });

    const dropCollection = () => User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    afterAll(() => { 
        disconnectDatabase();
    });

    describe('General', () => {

        it('Get empty user list', async () => {
            await request(app).get("/users").expect(200, []);
        });

        it('Get user list of 1 entry', async () => {
            const instance = await new User(doc).save();
            await request(app).get("/users")
                .expect(200, [{ _id: instance.id, ...doc }]).send();
        });

        it('Add new user', async () => {

            const getIdFromLocation = location => {
                const regex = /.+\/(.+)/g;
                const id = regex.exec(location)[1];
                return id;
            };

            const res = await request(app).post("/users").send(doc).expect(201);
            const id = getIdFromLocation(res.headers.location);
            const instance = await User.findById(id);

            expect({ ...instance._doc, _id: instance.id }).toEqual({ _id: id, ...doc }); 

        });

        it('Get missing user', async () => {
            await request(app).get('/users/123').expect(404, notFoundMessage);
        });

        it('Get one user', async () => {
            const instance = await new User(doc).save();
            await request(app).get(`/users/${instance.id}`)
                    .expect(200, { ...doc, _id: instance.id }).send();
        });

        it('Update missing user', async () => {
            await request(app).put(`/users/123`)
                .send({ ...doc, ...diff })
                .expect(404, notFoundMessage);
        });

        it('Update user', async () => {      
            const newInstance = await new User(doc).save();
            await request(app).put(`/users/${newInstance.id}`)
                .send({ ...doc, ...diff })
                .expect(200, { ...doc, _id: newInstance.id, ...diff });
        });

        it('Delete missing user', async () => {
            await request(app).delete('/users/123').expect(404, notFoundMessage);
        });

        it('Delete user', async () => {
            const instance = await new User(doc).save();
            await request(app).delete(`/users/${instance.id}`).expect(204);
            expect(await User.findById(instance.id)).toBeNull();        
        });
    });

    describe('Validation translation', () => {
        
        it('Add user with empty fields', async () => {
            const res = await request(app).post("/users").expect(400);
            validateFields(
                res,
                { name: "firstName", value: "First name is required" },
                { name: "lastName", value: "Last name required custom" }
            );
        });

        const validateFields = (res, ...fields) => {
            const { errors } = res.body;
            expect(errors).toBeDefined();
            fields.forEach(field => {
                expect(errors[field.name]).toBeDefined();
                expect(errors[field.name].message).toMatch(field.value);
            });
        };

        it('Add user with wrong first name', async () => {
            const res = await request(app).post("/users").send({ ...doc, firstName: "+=-!", lastName: "**/+" }).expect(400);
            validateFields(
                res,
                { name: "firstName", value: "First name is invalid" },
                { name: "lastName", value: "Last name is invalid custom" }
            );
        });

        it('Add non-unique email', async () => {
            const extendedDoc = { ...doc, email: "mail@mailbox.com", phoneNumber: "+123456" };
            await request(app).post("/users").send(extendedDoc).expect(201);
            const res = await request(app).post("/users").send(extendedDoc).expect(400);
            validateFields(
                res,
                { name: "email", value: "Email is not unique" },
                { name: "phoneNumber", value: "Phone number is not unique custom" }
            );
            await request(app).post("/users").send({ ...extendedDoc, email: "mail2@mailbox.com", phoneNumber: "+321" }).expect(201);
        });

    });

});
