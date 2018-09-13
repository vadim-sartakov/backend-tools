import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import createApp from '../../config/app';
import configureI18n from '../../config/i18n';
import { crudRouter } from '../../controller/crudController';
import User from './user';

const app = createApp(app => {
    configureI18n(app);
    app.use("/users", crudRouter(User));
});

describe('Crud controller integration tests', () => {

    beforeAll(() => {
        connectDatabase();
    });

    const dropCollection = () => User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    afterAll(() => { 
        disconnectDatabase();
    });

    const notFoundMessage = { message: 'Not found' };
    const doc = { firstName: "Bill", lastName: "Gates" };
    const diff = { firstName: "Steve" };

    it('Get empty user list', done => {
        request(app).get("/users").expect(200, [], done);
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
