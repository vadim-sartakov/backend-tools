import { app } from './server';
import { connection } from './config/database';
import request from 'supertest';

describe('Server integration tests', () => {

    const dropDatabase = () => connection.db.dropDatabase();

    beforeAll(dropDatabase);
    afterAll(dropDatabase);

    test('Get user list', () => {
        return request(app).get("/users").end((req, res) => {
            expect(res.status).toEqual(200);
            expect(res.body).toEqual([]);
        });
    });

});