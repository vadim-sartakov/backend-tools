import request from 'supertest';
import { expect } from 'chai';
import createApp from './app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import User from './user';

const app = createApp();

describe('General crud integration tests', () => {

    const notFoundMessage = { message: 'Not found' };
    const doc = { firstName: "Bill", lastName: "Gates" };
    const diff = { firstName: "Steve" };

    let conn;
    before(async () => {
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

        const expectedLinks = ({ first, prev, next, last, size }) => 
                `<http://127.0.0.1:${process.env.PORT}/users?page=${first}&size=${size}>; rel=first, ` +
                `<http://127.0.0.1:${process.env.PORT}/users?page=${prev}&size=${size}>; rel=previous, ` +
                `<http://127.0.0.1:${process.env.PORT}/users?page=${next}&size=${size}>; rel=next, ` +
                `<http://127.0.0.1:${process.env.PORT}/users?page=${last}&size=${size}>; rel=last`;

        it('Get empty user list', async () => {
            const res = await request(app).get("/users").expect(200, []);
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, prev: 0, next: 0, last: 0, size: 20 }));
            expect(res.get("X-Total-Count")).to.equal("0");
        });

        describe('Long list', () => {

            before(async () => {
                for(let i = 0; i < 20; i++)
                    await new User({ ...doc, number: i, email: `mail${i}@mail.co`, phoneNumber: i }).save();
            });

            it('Get user list of 50 entries', async () => {
                const res = await request(app).get("/users").expect(200).send();
                expect(res.get("Link")).to.equal(expectedLinks({ first: 0, prev: 0, next: 1, last: 3, size: 5 }));
                expect(res.get("X-Total-Count")).to.equal("20");
            });

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
