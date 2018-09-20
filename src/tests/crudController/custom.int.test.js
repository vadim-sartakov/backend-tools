import request from 'supertest';
import { expect } from 'chai';
import createApp from './config/app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import User, { userFilter } from './model/user';
import Role from './model/user';

describe('With custom callbacks provided', () => {

    let user, app, conn;
    before(async () => {
        user = { roles: [ "USER" ] };
        app = createApp(user, { 
            securityCallback: userFilter
        });
        conn = await connectDatabase("crudCustomOptsTests");
    });

    after(async () => { 
        await conn.connection.dropDatabase();
        await disconnectDatabase();
        app.close();
    });

});