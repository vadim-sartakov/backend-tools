import request from 'supertest';
import app from './app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import User from './user';

describe('General crud integration tests', () => {

    const notFoundMessage = { message: 'Not found' };
    const doc = { firstName: "Bill", lastName: "Gates" };
    const diff = { firstName: "Steve" };

    let conn;
    beforeAll(() => {
        conn = connectDatabase("crudGeneralTests");
    });

    const dropCollection = () => User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    afterAll(async () => { 
        await disconnectDatabase();
        await conn.connection.db.dropDatabase();
    });

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
