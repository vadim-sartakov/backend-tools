import request from 'supertest';
import { expect } from 'chai';
import createApp from './config/app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import User from './model/user';
import Role from './model/user';

/*const app = createApp({ 
    securityCallback: () => ({ number: 5 }),

    populateCallback: () => [{ path: 'roles', select: '-description' }, 'groups']
});*/

describe('With custom callbacks provided', () => {

    /*let conn;
    before(async () => {
        conn = await connectDatabase("crudCustomOptsTests");
    });

    after(async () => { 
        await conn.connection.dropDatabase();
        await disconnectDatabase();
        app.close();
    });*/

});