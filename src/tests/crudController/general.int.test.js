import mongoose from 'mongoose';
import request from 'supertest';
import { expect } from 'chai';
import createApp from '../app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { expectedLinks } from '../utils';
import { loadModels } from "../model/loader";

loadModels();

const User = mongoose.model("User");

describe('General crud integration tests', () => {

    const notFoundMessage = { message: 'Not found' };
    const doc = { firstName: "Bill", lastName: "Gates", roles: [] };
    const diff = { firstName: "Steve" };

    let app, port, conn;
    before(async () => {
        app = createApp();
        port = app.address().port;
        conn = await connectDatabase("crudGeneralTests");
    });

    const dropCollection = async () => await User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    after(async () => { 
        await conn.connection.dropDatabase();
        await disconnectDatabase();
        app.close();
    });

    describe('Get all', () => {

        it('Get empty user list', async () => {
            const res = await request(app).get("/users").expect(200, []);
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, last: 0, size: 20, port }));
            expect(res.get("X-Total-Count")).to.equal("0");
        });

    });

    describe('Add one', () => {

        it('Add new user', async () => {

            const getIdFromLocation = location => {
                const regex = /.+\/(.+)/g;
                const id = regex.exec(location)[1];
                return id;
            };

            const res = await request(app).post("/users").send(doc).expect(201);
            const id = getIdFromLocation(res.headers.location);
            const instance = await User.findById(id);

            expect({ ...instance._doc, _id: instance.id }).to.deep.equal({ _id: id, ...doc }); 

        });

    });

    describe('Get one', () => {

        it('Get missing user', async () => {
            await request(app).get('/users/123').expect(404, notFoundMessage);
        });

        it('Get one user', async () => {
            const instance = await new User(doc).save();
            await request(app).get(`/users/${instance.id}`)
                    .expect(200, { ...doc, _id: instance.id }).send();
        });

    });

    describe('Update one', () => {

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

    });  

    describe('Delete one', () => {

        it('Delete missing user', async () => {
            await request(app).delete('/users/123').expect(404, notFoundMessage);
        });

        it('Delete user', async () => {
            const instance = await new User(doc).save();
            await request(app).delete(`/users/${instance.id}`).expect(204);
            expect(await User.findById(instance.id)).to.be.null;        
        });

    });

});
