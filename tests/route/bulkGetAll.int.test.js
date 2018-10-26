import env from "../../src/config/env"; // eslint-disable-line no-unused-vars
import express from "express";
import mongoose, { Schema } from "mongoose";
import qs from "qs";
import request from "supertest";
import { expect } from "chai";
import commonMiddlewares from "../../src/middleware/common";
import { notFoundMiddleware, serverErrorMiddleware } from "../../src/middleware/http";
import { createI18n, createI18nMiddleware } from '../../src/config/i18n';
import crudRouter from "../../src/router/crud";
import { getNextPort, expectedLinks } from "../utils";

describe('Get all bulk tests', () => {

    const entryCount = 42;
    const now = new Date();
    const userSchema = new Schema({ firstName: String, lastName: String, phoneNumber: String, email: String, number: Number, createdAt: Date });

    let server, port, connection, User;

    const populateDatabase = async () => {
        let createdAt = now;
        for (let i = 0; i < entryCount; i++) {
            createdAt = new Date(createdAt);
            createdAt.setDate(createdAt.getDate() + 1);
            await new User({ firstName: "Bill", lastName: "Gates", number: i, phoneNumber: i, email: `mail${i}@mail.com`, createdAt }).save();
        }
    };
 
    before(async () => {

        connection = await mongoose.createConnection(`${process.env.DB_URL}/crudBulkGetAll`, { useNewUrlParser: true });
        User = connection.model("User", userSchema);
        
        const app = express();
        app.use(commonMiddlewares);
        app.use(createI18nMiddleware(createI18n()));
        app.use("/users", crudRouter(User));
        app.use(notFoundMiddleware());
        app.use(serverErrorMiddleware());
        server = app.listen(getNextPort());
        port = server.address().port;

        await populateDatabase();

    });

    after(async () => { 
        await connection.dropDatabase();
        await connection.close(true);
        server.close();
    });

    describe('Paging', () => {

        it('Get default page', async () => {
            const res = await request(server).get("/users").expect(200).send();
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, next: 1, last: 2, size: 20, port }));
            expect(res.get("X-Total-Count")).to.equal(entryCount.toString());
            expect(res.body.length).to.equal(20);
        });
    
        it('Get user page 0 with size 5', async () => {
            const res = await request(server).get("/users").query("page=0&size=5").expect(200).send();
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, next: 1, last: 8, size: 5, port }));
            expect(res.get("X-Total-Count")).to.equal(entryCount.toString());
            expect(res.body.length).to.equal(5);
        });
    
        it('Get user page 3 with size 5', async () => {
            const res = await request(server).get("/users").query("page=3&size=5").expect(200).send();
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, prev: 2, next: 4, last: 8, size: 5, port }));
            expect(res.get("X-Total-Count")).to.equal(entryCount.toString());
            expect(res.body.length).to.equal(5);
        });
    
        it('Get user last page with size 5', async () => {
            const res = await request(server).get("/users").query("page=8&size=5").expect(200).send();
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, prev: 7, last: 8, size: 5, port }));
            expect(res.get("X-Total-Count")).to.equal(entryCount.toString());
            expect(res.body.length).to.equal(2);
        });

    });

    describe('Filtering', () => {

        it('Equals', async () => {
            const res = await request(server).get("/users")
                    .query(qs.stringify({ filter: { phoneNumber: 1, email: "mail1@mail.com" } }))
                    .expect(200).send();
            expect(res.get("X-Total-Count")).to.equal("1");
        });

        it('Date range', async () => {
            const startDate = new Date(now);
            const endDate = new Date(now);
            startDate.setDate(startDate.getDate() + 5);
            endDate.setDate(endDate.getDate() + 10);
            const res = await request(server).get("/users")
                    .query(qs.stringify({ filter: { createdAt: { $gt: startDate, $lt: endDate } } }))
                    .expect(200).send();
            expect(res.get("X-Total-Count")).to.equal("4");
        });

        it('Date before', async () => {
            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() + 10);
            const res = await request(server).get("/users")
                    .query(qs.stringify({ filter: { createdAt: { $lt: endDate } } }))
                    .expect(200).send();
            expect(res.get("X-Total-Count")).to.equal("9");
        });

        it('Number great or equals', async () => {
            const res = await request(server).get("/users")
                    .query(qs.stringify({ filter: { number: { $gte: 12 } } }))
                    .expect(200).send();
            expect(res.get("X-Total-Count")).to.equal("30");
        });

        it('Or condition', async () => {
            const res = await request(server).get("/users")
                    .query(qs.stringify({ filter: { $or: [ { number: 12 }, { email: "mail1@mail.com" } ] } }))
                    .expect(200).send();
            expect(res.get("X-Total-Count")).to.equal("2");
        });

    });

    describe('Sorting', () => {

        it ('Desc number', async () => {
            const res = await request(server).get("/users")
                .query(qs.stringify({ sort: { number: -1 } }))
                .expect(200).send();
            expect(res.body[0].number).to.equal(41);
        });

    });

});