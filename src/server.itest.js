import express from 'express';
import mongoose from 'mongoose';
import { disconnectDatabase } from './config/database';
import configureApp from './config/app';
import User from './userManagement/model/user';
import request from 'supertest';

const app = express();
configureApp(app);

describe('Server integration tests', () => {

    const dropCollection = () => User.deleteMany({ });
    beforeEach(dropCollection);

    afterAll(() => disconnectDatabase());

    it('Get user list', (done) => {
        request(app).get("/users")
            .expect(200, [], done);
    });

    it('Add new user', (done) => {

        var newLocation;
        request(app).post("/users")
            .send({ username: "user 1" })
            .expect(201)
            .end((err, res) => {
                newLocation = res.headers.location;
            });

        request(app).get("/users")
            .expect(200, [ { _id: newLocation, username: "user 1" } ], done);

    });

});
