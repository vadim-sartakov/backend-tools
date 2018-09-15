import request from 'supertest';
import createApp from './app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import User from './user';

describe('Custom crud options', () => {

    let conn;
    beforeAll(async () => {
        conn = await connectDatabase("crudCustomizedTests");
    });

    const dropCollection = async () => await User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    afterAll(async () => { 
        await conn.connection.dropDatabase();
        await disconnectDatabase();
    });

    it('Customized security access', () => {

    });

});