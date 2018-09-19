import request from 'supertest';
import { expect } from 'chai';
import qs from 'qs';
import createApp from './app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import User from './user';
import { expectedLinks } from './utils';

const app = createApp();
const port = app.address().port;

describe('Get all bulk tests', () => {

    const doc = { firstName: "Bill", lastName: "Gates" };
    const entryCount = 42;

    let conn;
    before(async () => {
        conn = await connectDatabase("bulkGetAll");
        for(let i = 0; i < entryCount; i++)
            await new User({ ...doc, number: i, email: `mail${i}@mail.com`, phoneNumber: i }).save();
    });

    after(async () => { 
        await conn.connection.dropDatabase();
        await disconnectDatabase();
        app.close();
    });

    describe('Paging', () => {

        it('Get default page', async () => {
            const res = await request(app).get("/users").expect(200).send();
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, next: 1, last: 2, size: 20, port }));
            expect(res.get("X-Total-Count")).to.equal(entryCount.toString());
            expect(res.body.length).to.equal(20);
        });
    
        it('Get user page 0 with size 5', async () => {
            const res = await request(app).get("/users").query("page=0&size=5").expect(200).send();
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, next: 1, last: 8, size: 5, port }));
            expect(res.get("X-Total-Count")).to.equal(entryCount.toString());
            expect(res.body.length).to.equal(5);
        });
    
        it('Get user page 3 with size 5', async () => {
            const res = await request(app).get("/users").query("page=3&size=5").expect(200).send();
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, prev: 2, next: 4, last: 8, size: 5, port }));
            expect(res.get("X-Total-Count")).to.equal(entryCount.toString());
            expect(res.body.length).to.equal(5);
        });
    
        it('Get user last page with size 5', async () => {
            const res = await request(app).get("/users").query("page=8&size=5").expect(200).send();
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, prev: 7, last: 8, size: 5, port }));
            expect(res.get("X-Total-Count")).to.equal(entryCount.toString());
            expect(res.body.length).to.equal(2);
        });

    });

    describe('Filtering', () => {

        it('Equals', async () => {
            const res = await request(app).get("/users")
                    .query(qs.stringify({ filter: { phoneNumber: 1, email: "mail1@mail.com" } }))
                    .expect(200).send();
            expect(res.get("X-Total-Count")).to.equal("1");
        });

        it('Date range', async () => {

        });

    });

});