import mongoose, { Schema } from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../config/database';
import createApp from '../config/app';
import configureI18n from '../config/i18n';
import { crudRouter } from '../controller/crudController';

const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        lowercase: true
    }
});

const User = mongoose.model("User", userSchema);

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
        mongoose.connection.close(true);
    });

    const doc = { firstName: "Bill", lastName: "Gates" };

    it('Get empty user list', done => {
        request(app).get("/users").expect(200, [], done);
    });

    it('Get user list of 1 entry', done => {
        new User(doc).save().then(instance => {
            request(app).get("/users")
                .expect(200, [{ _id: instance.id, __v: 0, ...doc }], done);
        });
    });

    it('Add new user', done => {

        request(app).post("/users")
            .send(doc)
            .expect(201)
            .then(res => {
                const newLocation = res.headers.location;
                const regex = /.+\/(.+)/g;
                const id = regex.exec(newLocation)[1];
                User.findById(id).then(instance => {
                    expect({ ...instance._doc, _id: instance.id }).toEqual({ _id: id, __v: 0, ...doc });
                    done();
                });
            });        

    });

    it('Get missing user', done => {
        request(app).get('/users/123').expect(404, { message: 'Not found' }, done);
    });

    it('Get one user', done => {
        new User(doc).save().then(instance => {
            request(app).get(`/users/${instance.id}`)
                .expect(200, { ...doc, _id: instance.id, __v: 0 }, done);
        });
    });

    it('Update user', done => {
        const diff = { firstName: "Steve" };
        new User(doc).save().then(instance => {
            request(app).put(`/users/${instance.id}`).send({ ...doc, ...diff }).expect(204).then(() => {
                User.findById(instance.id).then(instance => {
                    expect({ ...instance._doc, _id: instance.id }).toEqual({ ...doc, _id: instance.id, __v: 1, ...diff });
                    done();
                });
            });
        });
    });

});
