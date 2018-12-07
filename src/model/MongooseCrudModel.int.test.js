import mongoose, { Schema } from "mongoose";
import { expect } from "chai";
import MongooseCrudModel from "./MongooseCrudModel";

mongoose.set("debug", true);

describe("Mongoose crud model tests", () => {

    const subdocumentSchema = new Schema({

    });

    const arraySchema = new Schema({
        
    });

    const entrySchema = new Schema({
        counter: Number,
        date: Date,

    });
    
    let Entry, connection, model;

    before(async () => {
        connection = await mongoose.createConnection(process.env.DB_URL, { useNewUrlParser: true });
        Entry = connection.model("Entry", entrySchema);
        model = new MongooseCrudModel(Entry);
    });

    after(async () => {
        await connection.dropDatabase();
        await connection.close(true);
    });

    const cleanDatabase = async () => await Entry.remove({ });

    beforeEach(cleanDatabase);

    const populateDatabase = async entryCount => {
        let date = new Date();
        for (let counter = 0; counter < entryCount; counter++) {
            date = new Date(date);
            date.setDate(date.getDate() + 1);
            await new Entry({ counter, date }).save();
        }
    };

    describe("GetAll", () => {

        it("Empty page", async () => {
            const result = await model.getAll({ page: 0, size: 20 });
            expect(result).to.deep.equal([ ]);
        });

        it("Get page 2 with size 5 and count 12", async () => {
            await populateDatabase(12);
            const result = await model.getAll({ page: 1, size: 5 });
            expect(result.length).to.equal(5);
        });

        it("Get page 3 with size 5 and count 12", async () => {
            await populateDatabase(12);
            const result = await model.getAll({ page: 2, size: 5 });
            expect(result.length).to.equal(2);
        });

        it("Get page 1 with size 5 and count 12 with wide number filter and sort by counter asc", async () => {
            await populateDatabase(12);
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: { $gte: 2 } }, sort: { counter: 1 } });
            expect(result.length).to.equal(5);
            expect(result[0].counter).to.equal(2);
        });

        it("Get page 1 with size 5 and count 12 with wide number filter and sort by counter desc", async () => {
            await populateDatabase(12);
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: { $gte: 2 } }, sort: { counter: -1 } });
            expect(result.length).to.equal(5);
            expect(result[0].counter).to.equal(11);
        });

        it("Get page 1 with size 5 and count 12 with narrow number filter", async () => {
            await populateDatabase(12);
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: 2 } });
            expect(result.length).to.equal(1);
        });

        it("Get page 1 with size 5 and count 12 with permission read filter and regular filter to restricted entry", async () => {
            await populateDatabase(12);
            const permissions = { "readFilter": { counter: 2 } };
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: 5 } }, permissions);
            expect(result.length).to.equal(0);
        });

    });

    /*describe('Filtering', () => {

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

    });*/

});