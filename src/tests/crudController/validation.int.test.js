import request from 'supertest';
import createApp from './app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import User from './user';

const app = createApp();

describe('Validation and translations', () => {
        
    const doc = { firstName: "Bill", lastName: "Gates" };

    let conn;
    beforeAll(async () => {
        conn = await connectDatabase("crudValidationTests");
    });

    const dropCollection = async () => await User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    afterAll(async () => { 
        await conn.connection.dropDatabase();
        await disconnectDatabase();
    });

    it('Add user with empty fields', async () => {
        const res = await request(app).post("/users").expect(400);
        validateFields(
            res,
            2,
            { name: "firstName", value: "First name is required" },
            { name: "lastName", value: "Last name required custom" }
        );
    });

    const validateFields = (res, errCount, ...fields) => {
        const { errors } = res.body;
        expect(errors).toBeDefined();
        expect(Object.keys(errors).length).toEqual(errCount);
        fields.forEach(field => {
            expect(errors[field.name]).toBeDefined();
            expect(errors[field.name].message).toMatch(field.value);
        });
    };

    it('Add user with wrong first name', async () => {
        const res = await request(app).post("/users").send({ ...doc, firstName: "+=-!", lastName: "**/+" }).expect(400);
        validateFields(
            res,
            2,
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
            2,
            { name: "email", value: "Email is not unique" },
            { name: "phoneNumber", value: "Phone number is not unique custom" }
        );
        await request(app).post("/users").send({ ...extendedDoc, email: "mail2@mailbox.com", phoneNumber: "+321" }).expect(201);
    });

    it('Update existing entry with wrong values', async () => {
        const extendedDoc = { ...doc, email: "mail@mailbox.com", phoneNumber: "+123456" };
        await new User(extendedDoc).save();
        const instance = await new User({ ...extendedDoc, email: "mail2@mailbox.com", phoneNumber: "+321" }).save();
        const res = await request(app).put(`/users/${instance.id}`).send({ ...extendedDoc, firstName: "/*+-" }).expect(400);
        validateFields(
            res,
            3,
            { name: "firstName", value: "First name is invalid" },
            { name: "email", value: "Email is not unique" },
            { name: "phoneNumber", value: "Phone number is not unique custom" }
        );
    });

});