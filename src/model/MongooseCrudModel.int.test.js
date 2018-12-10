import mongoose, { Schema } from "mongoose";
import { expect } from "chai";
import MongooseCrudModel from "./MongooseCrudModel";

describe("Mongoose crud model tests", () => {

    const entrySchema = new Schema({
        counter: Number,
        date: Date,
        embedded: new Schema({ firstField: String, secondField: String }),
        simpleArray: [{ id: Number, field: String }],
        complexArray: [{ id: Number, field: String, nested: { id: Number, field: String } }]
    }, { versionKey: false });

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

    const createDoc = (counter, date) => {
        const embedded = { firstField: counter.toString(), secondField: counter.toString() };
        const simpleArray = [];
        const complexArray = [];
        for (let rowCounter = 0; rowCounter < 10; rowCounter++) {
            const element = { id: rowCounter, field: rowCounter.toString() };
            simpleArray.push(element);
            complexArray.push({
                ...element,
                nestedArray: [ { id: 1, field: "1" }, { id: 2, field: "2" } ]
            });
        }
        return { counter, date, embedded, simpleArray, complexArray };
    };

    const populateDatabase = async entryCount => {
        let date = new Date();
        for (let counter = 0; counter < entryCount; counter++) {
            date = new Date(date);
            await new Entry(createDoc(counter, date)).save();
        }
    };

    describe("Get all", () => {

        afterEach(cleanDatabase);

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

        it("Get page 1 with size 5 and count 12 with wide filter and sort by counter asc", async () => {
            await populateDatabase(12);
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: { $gte: 2 } }, sort: { counter: 1 } });
            expect(result.length).to.equal(5);
            expect(result[0].counter).to.equal(2);
        });

        it("Get page 1 with size 5 and count 12 with wide filter and sort by counter desc", async () => {
            await populateDatabase(12);
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: { $gte: 2 } }, sort: { counter: -1 } });
            expect(result.length).to.equal(5);
            expect(result[0].counter).to.equal(11);
        });

        it("Get page 1 with size 5 and count 12 with narrow filter", async () => {
            await populateDatabase(12);
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: 2 } });
            expect(result.length).to.equal(1);
        });

        it("Get page 1 with size 5 and count 12 with permission read filter and regular filter to restricted entry", async () => {
            await populateDatabase(12);
            const permissions = { filter: { counter: 2 } };
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: 5 } }, permissions);
            expect(result.length).to.equal(0);
        });

        it("Get page 1 with size 5 and count 12 with permission read filter and regular filter to allowed entry", async () => {
            await populateDatabase(12);
            const permissions = { filter: { counter: 5 } };
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: 5 } }, permissions);
            expect(result.length).to.equal(1);
        });

        it("Get page 1 with size 5 and count 12 with specified read fields permission", async () => {
            await populateDatabase(12);
            const permissions = { readFields: { counter: 1 } };
            const result = await model.getAll({ page: 0, size: 5 }, permissions);
            expect(result[1].counter).to.be.ok;
            expect(result[1].date).not.to.be.ok;
        });

    });

    describe("Count", () => {
        
        before(async () => await populateDatabase(10));
        after(cleanDatabase);

        it("Simple count", async () => {
            const result = await model.count();
            expect(result).to.equal(10);
        });

        it("Count with filter", async () => {
            const result = await model.count({ counter: 5 });
            expect(result).to.equal(1);
        });

        it("Count with permission and filter to allowed entry", async () => {
            const permissions = { filter: { counter: 5 } };
            const result = await model.count({ counter: 5 }, permissions);
            expect(result).to.equal(1);
        });

        it("Count with permission and filter to prohibited entry", async () => {
            const permissions = { filter: { counter: 3 } };
            const result = await model.count({ counter: 5 }, permissions);
            expect(result).to.equal(0);
        });

    });

    describe("Add one", () => {

        let instance;
        beforeEach(() => instance = createDoc(5, new Date()));
        afterEach(cleanDatabase);

        it("Creating", async () => {
            const result = await model.addOne(instance);
            expect(result).to.be.ok;
            expect(result._doc).not.to.be.ok;
        });

        it("Creating with specified exclusive modify field permission", async () => {
            const permissions = { modifyFields: { "counter": 0, "embedded.firstField": 0, "simpleArray": 0 } };
            const result = await model.addOne(instance, permissions);
            expect(result).to.be.ok;
            expect(result.counter).not.to.be.ok;
            expect(result.date).to.be.ok;
            expect(result.embedded.firstField).not.to.be.ok;
            //expect(result.simpleArray).not.to.be.ok;
            expect(result.embedded.secondField).to.be.ok;
            const saved = await Entry.findOne({ }).lean();
            expect(result).to.deep.equal(saved);
        });

        it("Creating with specified inclusive modify field permission", async () => {
            const permissions = { modifyFields: { "counter": 1 } };
            const result = await model.addOne(instance, permissions);
            expect(result).to.be.ok;
            expect(result.counter).to.be.ok;
            expect(result.date).not.to.be.ok;
            expect(result.embedded.firstField).not.to.be.ok;
            //expect(result.simpleArray).not.to.be.ok;
            expect(result.embedded.secondField).not.to.be.ok;
            const saved = await Entry.findOne({ }).lean();
            expect(result).to.deep.equal(saved);
        });

    });

});