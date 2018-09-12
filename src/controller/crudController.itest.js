import app from '../config/app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import User from '../userManagement/model/user';
import request from 'supertest';

describe('Crud controller integration tests', () => {

    beforeAll(() => {
        connectDatabase();
    });

    const dropCollection = () => User.deleteMany({ });
    beforeEach(dropCollection);

    afterAll(() => { 
        disconnectDatabase();
    });

    it('Get user list', (done) => {
        request(app).get("/users")
            .expect(200, [], done);
    });

    it('Add new user', (done) => {

        request(app).post("/users")
            .send({ username: "user 1" })
            .expect(201)
            .then(res => {
                const newLocation = res.headers.location;
                const regex = /.+\/(.+)/g;
                const id = regex.exec(newLocation)[1];
                request(app).get("/users")
                    .expect(200, [ { _id: id, username: "user 1" } ], done);
            });        

    });

});
