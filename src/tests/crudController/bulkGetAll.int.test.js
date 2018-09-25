import env from "../../config/env"; // eslint-disable-line no-unused-vars
import express from "express";
import mongoose from "mongoose";
import qs from "qs";
import request from "supertest";
import { expect } from "chai";
import generalMiddlewares from "../../middleware/general";
import httpMiddlewares from "../../middleware/http";
import { createI18n, createI18nMiddleware } from '../../middleware/i18n';
import crudValidationMiddleware from "../../middleware/crud";
import crudRouter from "../../controller/crudController";
import { getNextPort, expectedLinks, populateDatabase } from "../utils";
import { loadModels } from "../model/loader";

mongoose.set("debug", true);
loadModels();

const User = mongoose.model("User");

describe('Get all bulk tests', () => {

    const entryCount = 42;
    const now = new Date();

    let server, port, con;
    before(async () => {
        const app = express();
        app.use(generalMiddlewares);
        app.use(createI18nMiddleware(createI18n()));
        app.use("/users", crudRouter(User));
        app.use(crudValidationMiddleware);
        app.use(httpMiddlewares);
        server = app.listen(getNextPort());
        port = server.address().port;
        con = await mongoose.connect(`${process.env.DB_URL}/crudBulkGetAll`, { useNewUrlParser: true });
        await populateDatabase(entryCount, now);
    });

    after(async () => { 
        await con.connection.dropDatabase();
        await con.connection.close(true);
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