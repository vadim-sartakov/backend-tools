import express from "express";
import chai, { expect } from "chai";
import { fake } from "sinon";
import sinonChai from "sinon-chai";
import request from "supertest";
import qs from "qs";

import crudRouter from "./crud";

chai.use(sinonChai);

const expectedLinks = ({ first, prev, next, last, size }) => 
        `<http:(.+)\\?page=${first}&size=${size}>; rel=first, ` +
        `${prev !== undefined ? `<http:(.+)\\?page=${prev}&size=${size}>; rel=previous, ` : ""}` +
        `${next !== undefined ? `<http:(.+)\\?page=${next}&size=${size}>; rel=next, ` : ""}` +
        `<http:(.+)\\?page=${last}&size=${size}>; rel=last`;
class StubModel {
    constructor({ getAllResult, countResult, addOneResult, getOneResult, updateOneResult, deleteOneResult }) {
        this.getAll = getAllResult && fake(async () => getAllResult);
        this.count = countResult !== undefined && fake(async () => countResult);
        this.addOne = addOneResult && fake(async () => addOneResult);
        this.getOne = getOneResult && fake(async () => getOneResult);
        this.updateOne = updateOneResult && fake(async () => updateOneResult);
        this.deleteOne = deleteOneResult && fake(async () => deleteOneResult);
    }
}

describe("Crud router", () => {

    const getBulkResult = entryCount => {
        const result = [];
        for (let id = 0; id < entryCount; id++) {
            result.push({ id });
        }
        return result;
    };

    describe("Get all", () => {

        const initialize = modelArgs => {
            const model = new StubModel(modelArgs);
            const router = crudRouter(model);
            const app = express();
            app.use(router);
            return { model, app };
        };

        describe("Paging", () => {
            
            it("Get empty page", async () => {
                const { model, app } = initialize({ getAllResult: [], countResult: 0 });
                const res = await request(app).get("/").expect(200, []);
                expect(model.getAll).to.have.been.calledWith({ page: 0, size: 20, filter: undefined, sort: undefined });
                expect(model.count).to.have.been.calledWith(undefined);
                expect(res.get("Link")).to.match( new RegExp( expectedLinks({ first: 0, last: 0, size: 20 }) ) );
                expect(res.get("X-Total-Count")).to.equal("0");
            });

            it('Get default page', async () => {
                const { model, app } = initialize({ getAllResult: getBulkResult(20), countResult: 50 });
                const res = await request(app).get("/").expect(200);
                expect(model.getAll).to.have.been.calledWith({ page: 0, size: 20, filter: undefined, sort: undefined });
                expect(model.count).to.have.been.calledWith(undefined);
                expect(res.get("Link")).to.match( new RegExp( expectedLinks({ first: 0, next: 1, last: 2, size: 20 }) ) );
                expect(res.get("X-Total-Count")).to.equal("50");
                expect(res.body.length).to.equal(20);
            });

            it('Get user page 0 with size 5', async () => {
                const { model, app } = initialize({ getAllResult: getBulkResult(5), countResult: 42 });
                const res = await request(app).get("/").query("page=0&size=5").expect(200);
                expect(model.getAll).to.have.been.calledWith({ page: 0, size: 5, filter: undefined, sort: undefined });
                expect(model.count).to.have.been.calledWith(undefined);
                expect(res.get("Link")).to.match(new RegExp( expectedLinks({ first: 0, next: 1, last: 8, size: 5 }) ) );
                expect(res.get("X-Total-Count")).to.equal("42");
                expect(res.body.length).to.equal(5);
            });
        
            it('Get user page 3 with size 5', async () => {
                const { model, app } = initialize({ getAllResult: getBulkResult(5), countResult: 42 });
                const res = await request(app).get("/").query("page=3&size=5").expect(200);
                expect(model.getAll).to.have.been.calledWith({ page: 3, size: 5, filter: undefined, sort: undefined });
                expect(model.count).to.have.been.calledWith(undefined);
                expect(res.get("Link")).to.match( new RegExp( expectedLinks({ first: 0, prev: 2, next: 4, last: 8, size: 5 }) ) );
                expect(res.get("X-Total-Count")).to.equal("42");
                expect(res.body.length).to.equal(5);
            });
        
            it('Get user last page with size 5', async () => {
                const { model, app } = initialize({ getAllResult: getBulkResult(2), countResult: 42 });
                const res = await request(app).get("/").query("page=8&size=5").expect(200);
                expect(model.getAll).to.have.been.calledWith({ page: 8, size: 5, filter: undefined, sort: undefined });
                expect(model.count).to.have.been.calledWith(undefined);
                expect(res.get("Link")).to.match( new RegExp(expectedLinks({ first: 0, prev: 7, last: 8, size: 5 }) ) );
                expect(res.get("X-Total-Count")).to.equal("42");
                expect(res.body.length).to.equal(2);
            });

        });

        describe('Filtering', () => {

            it('Equals', async () => {
                const { model, app } = initialize({ getAllResult: getBulkResult(1), countResult: 1 });
                const filter = { email: "mail1@mail.com" };
                const res = await request(app).get("/")
                        .query(qs.stringify({ filter }))
                        .expect(200);
                expect(model.getAll).to.have.been.calledWith({ page: 0, size: 20, filter, sort: undefined });
                expect(model.count).to.have.been.calledWith(filter);
                expect(res.get("X-Total-Count")).to.equal("1");
                expect(res.body.length).to.equal(1);
            });

            /*it('Date range', async () => {
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
            });*/

        });

        /*describe('Sorting', () => {

            it ('Desc number', async () => {
                const res = await request(server).get("/users")
                    .query(qs.stringify({ sort: { number: -1 } }))
                    .expect(200).send();
                expect(res.body[0].number).to.equal(41);
            });

        });*/

    });

});