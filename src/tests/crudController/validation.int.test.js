import env from "../../config/env"; // eslint-disable-line no-unused-vars
import express from "express";
import mongoose, { Schema } from "mongoose";
import request from "supertest";
import { expect } from "chai";
import mongooseUniqueValidator from "mongoose-unique-validator";
import generalMiddlewares from "../../middleware/general";
import httpMiddlewares from "../../middleware/http";
import { createI18n, createI18nMiddleware } from '../../middleware/i18n';
import crudValidationMiddleware from "../../middleware/crud";
import crudRouter from "../../controller/crudController";
import { getNextPort } from "../utils";

mongoose.set("debug", true);

describe('Validation and translations', () => {

    const userSchema = new Schema({
        firstName: {
            type: String,
            required: true,
            match: /^\w+$/
        },
        lastName: {
            type: String,
            required: true,
            match: /^\w+$/
        },
        email: {
            type: String,
            lowercase: true,
            unique: true
        },
        phoneNumber: {
            type: String,
            unique: true
        }
    });

    const userTranslations = {
        firstName: {
            name: "First name"
        },
        lastName: {
            name: "Last name",
            validation: {
                required: "`Last name` is required custom",
                regexp: "`Last name` is invalid custom"
            }
        },
        email: {
            name: "Email"
        },
        phoneNumber: {
            name: "Phone number",
            validation: {
                unique: "`Phone number` is not unique custom"
            }
        }
    };

    const bill = { firstName: "Bill", lastName: "Gates" };

    let server, connection, User, i18n;
    before(async () => {

        i18n = createI18n();
        i18n.addResourceBundle("en", "model.User", userTranslations);

        connection = await mongoose.createConnection(`${process.env.DB_URL}/crudValidationTests`, { useNewUrlParser: true });

        userSchema.plugin(mongooseUniqueValidator);
        User = connection.model("User", userSchema);

        const app = express();
        app.use(generalMiddlewares);
        app.use(createI18nMiddleware(i18n));
        app.use("/users", crudRouter(User));
        app.use(crudValidationMiddleware);
        app.use(httpMiddlewares);
        server = app.listen(getNextPort());

    });

    after(async () => { 
        await connection.dropDatabase();
        await connection.close(true);
        server.close();
    });

    const dropCollection = async () => await User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    it('Add user with empty fields', async () => {
        const res = await request(server).post("/users").expect(400);
        validateFields(
            res,
            2,
            { name: "firstName", value: "`First name` is required" },
            { name: "lastName", value: "`Last name` is required custom" }
        );
    });

    const validateFields = (res, errCount, ...fields) => {
        const { errors } = res.body;
        expect(errors).not.to.be.undefined;
        expect(Object.keys(errors).length).to.equal(errCount);
        fields.forEach(field => {
            expect(errors[field.name]).not.to.be.undefined;
            expect(errors[field.name].message).to.equal(field.value);
        });
    };

    it('Add user with wrong first name', async () => {
        const res = await request(server).post("/users").send({ ...bill, firstName: "+=-!", lastName: "**/+" }).expect(400);
        validateFields(
            res,
            2,
            { name: "firstName", value: "`First name` is invalid" },
            { name: "lastName", value: "`Last name` is invalid custom" }
        );
    });

    it('Add non-unique email', async () => {
        const extendedDoc = { ...bill, email: "mail@mailbox.com", phoneNumber: "+123456" };
        await request(server).post("/users").send(extendedDoc).expect(201);
        const res = await request(server).post("/users").send(extendedDoc).expect(400);
        validateFields(
            res,
            2,
            { name: "email", value: "`Email` is not unique" },
            { name: "phoneNumber", value: "`Phone number` is not unique custom" }
        );
        await request(server).post("/users").send({ ...extendedDoc, email: "mail2@mailbox.com", phoneNumber: "+321" }).expect(201);
    });

    it('Update existing entry with wrong values', async () => {
        const extendedDoc = { ...bill, email: "mail@mailbox.com", phoneNumber: "+123456" };
        await new User(extendedDoc).save();
        const instance = await new User({ ...extendedDoc, email: "mail2@mailbox.com", phoneNumber: "+321" }).save();
        const res = await request(server).put(`/users/${instance.id}`).send({ ...extendedDoc, firstName: "/*+-" }).expect(400);
        validateFields(
            res,
            3,
            { name: "firstName", value: "`First name` is invalid" },
            { name: "email", value: "`Email` is not unique" },
            { name: "phoneNumber", value: "`Phone number` is not unique custom" }
        );
    });

});