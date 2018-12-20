import mongoose, { Schema } from "mongoose";
import { expect } from "chai";
import MongooseCrudModel from "./MongooseCrudModel";

describe("Mongoose crud model tests", () => {

    const nestedSchema = new Schema({ counter: Number, string: String });
    const entrySchema = new Schema({
        counter: Number,
        date: Date,
        string: String,
        nested: { type: Schema.Types.ObjectId, ref: "Nested" }
    });

    let Nested, Entry, connection, model;

    before(async () => {
        connection = await mongoose.createConnection(process.env.DB_URL, { useNewUrlParser: true });
        Nested = connection.model("Nested", nestedSchema);
        Entry = connection.model("Entry", entrySchema);
        model = new MongooseCrudModel(Entry);
    });

    after(async () => {
        await connection.dropDatabase();
        await connection.close(true);
    });

    const cleanDatabase = async () => {
        await Nested.remove({ });
        await Entry.remove({ });
    };

    const populateDatabase = async entryCount => {
        const nested = new Nested({ counter: 0, string: "Nested field" });
        await nested.save();
        let date = new Date();
        for (let counter = 0; counter < entryCount; counter++) {
            date = new Date(date);
            await new Entry({ counter, date, string: counter, nested }).save();
        }
    };

    describe("Get all", () => {

        beforeEach(async () => await populateDatabase(12));
        afterEach(cleanDatabase);

        it("Empty page", async () => {
            await cleanDatabase();
            const result = await model.getAll({ page: 0, size: 20 });
            expect(result).to.deep.equal([ ]);
        });

        it("Get page 2 with size 5 and count 12", async () => {
            const result = await model.getAll({ page: 1, size: 5 });
            expect(result.length).to.equal(5);
        });

        it("Get page 3 with size 5 and count 12", async () => {
            const result = await model.getAll({ page: 2, size: 5 });
            expect(result.length).to.equal(2);
        });

        it("Wide filter and sort by counter asc", async () => {
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: { $gte: 2 } }, sort: { counter: 1 } });
            expect(result.length).to.equal(5);
            expect(result[0].counter).to.equal(2);
        });

        it("Wide filter and sort by counter desc", async () => {
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: { $gte: 2 } }, sort: { counter: -1 } });
            expect(result.length).to.equal(5);
            expect(result[0].counter).to.equal(11);
        });

        it("Narrow filter", async () => {
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: 2 } });
            expect(result.length).to.equal(1);
        });

        it("Permission read filter and regular filter to restricted entry", async () => {
            const permissions = { read: { filter: { counter: 2 } } };
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: 5 } }, permissions);
            expect(result.length).to.equal(0);
        });

        it("Permission read filter and regular filter to allowed entry", async () => {
            const permissions = { read: { filter: { counter: 5 } } };
            const result = await model.getAll({ page: 0, size: 5, filter: { counter: 5 } }, permissions);
            expect(result.length).to.equal(1);
        });

        it("Specified read fields permission", async () => {
            const permissions = { read: { projection: { counter: 1 } } };
            const result = await model.getAll({ page: 0, size: 5 }, permissions);
            expect(result[1].counter).to.be.ok;
            expect(result[1].date).not.to.be.ok;
        });

        it("Excerpt projection", async () => {
            model = new MongooseCrudModel(Entry, { excerptProjection: { counter: 1 } });
            const result = await model.getAll({ page: 0, size: 20 });
            expect(result[1].counter).to.be.ok;
            expect(result[1].date).not.to.be.ok;
        });

        it("Population", async () => {
            model = new MongooseCrudModel(Entry, { populate: { path: "nested", select: { counter: 1 } } });
            const result = await model.getAll({ page: 0, size: 20 });
            expect(result[0].nested).to.be.ok;
            expect(result[0].nested.counter).to.equal(0);
            expect(result[0].nested.string).not.to.be.ok;
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
            const permissions = { read: { filter: { counter: 5 } } };
            const result = await model.count({ counter: 5 }, permissions);
            expect(result).to.equal(1);
        });

        it("Count with permission and filter to prohibited entry", async () => {
            const permissions = { read: { filter: { counter: 3 } } };
            const result = await model.count({ counter: 5 }, permissions);
            expect(result).to.equal(0);
        });

    });

    describe("Add one", () => {

        let instance;
        beforeEach(() => instance = { counter: 5, date: new Date(), string: "5" });
        afterEach(cleanDatabase);

        it("Creating", async () => {
            const result = await model.addOne(instance);
            expect(result).to.be.ok;
            expect(result._doc).not.to.be.ok;
        });

        it("Creating with specified exclusive read and modify field permission", async () => {
            const permissions = { update: { projection: { date: 0 } } };
            const result = await model.addOne(instance, permissions);
            expect(result).to.be.ok;
            const saved = await Entry.findOne({ }).lean();
            expect(saved).to.be.ok;
            expect(saved.counter).to.be.ok;
            expect(saved.date).not.to.be.ok;
            expect(saved.string).to.be.ok;
        });

        it("Creating with specified inclusive modify field permission", async () => {
            const permissions = { update: { projection: { date: 1 } } };
            const result = await model.addOne(instance, permissions);
            expect(result).to.be.ok;
            const saved = await Entry.findOne({ }).lean();
            expect(saved).to.be.ok;
            expect(saved.counter).not.to.be.ok;
            expect(saved.date).to.be.ok;
            expect(saved.string).not.to.be.ok;
        });

    });

    describe("Get one", () => {
        
        let prepopulated;

        before(async () => {
            await populateDatabase(10);
            prepopulated = await Entry.find({}).sort({ counter: 1 }).exec();
        });
        after(cleanDatabase);

        it("Get single entry without filters", async () => {
            const result = await model.getOne({ id: prepopulated[0]._id });
            expect(result).to.be.ok;
            expect(result.counter).to.equal(0);
        });

        it("Get single entry with filter to prohibited entry", async () => {
            const permissions = { filter: { counter: 0 } };
            const result = await model.getOne({ id: prepopulated[5]._id }, permissions);
            expect(result).not.to.be.ok;
        });

        it("Get single entry with filter to allowed entry and fields permissions", async () => {
            const permissions = { filter: { counter: 1 }, readFields: { "date": 0 } };
            const result = await model.getOne({ id: prepopulated[1]._id }, permissions);
            expect(result).to.be.ok;
            expect(result.counter).to.be.ok;
            expect(result.date).not.to.be.ok;
        });

        it("Get single entry with getOne fields permission", async () => {
            const permissions = { getOneFields: { "date": 0 } };
            const result = await model.getOne({ id: prepopulated[1]._id }, permissions);
            expect(result).to.be.ok;
            expect(result.counter).to.be.ok;
            expect(result.date).not.to.be.ok;
        });

    });

    describe("Update one", () => {
        
        let instances;

        beforeEach(async () => {
            await cleanDatabase();
            await populateDatabase(10);
            instances = await Entry.find({}).lean();
        });

        after(cleanDatabase);

        it("Simple update", async () => {
            const result = await model.updateOne({ id: instances[0]._id }, { counter: 10, string: "5" });
            expect(result.counter).to.equal(10);
            expect(result.string).to.equal("5");
            const saved = await Entry.findOne({ _id: instances[0]._id }).lean();
            expect(saved.counter).to.equal(10);
            expect(saved.string).to.equal("5");
        });

        it("Update denied with permission filter to denied entry", async () => {
            const permission = { filter: { counter: 5 } };
            const result = await model.updateOne({ id: instances[0]._id }, { counter: 10, string: "5" }, permission);
            expect(result).not.to.be.ok;
            const saved = await Entry.findOne({ _id: instances[0]._id }).lean();
            expect(saved.counter).to.equal(0);
            expect(saved.string).to.equal("0");
        });

        it("Update denied with permission filter to allowed entry", async () => {
            const permission = { filter: { counter: 0 } };
            const result = await model.updateOne({ id: instances[0]._id }, { counter: 10, string: "5" }, permission);
            expect(result).to.be.ok;
            const saved = await Entry.findOne({ _id: instances[0]._id }).lean();
            expect(saved.counter).to.equal(10);
            expect(saved.string).to.equal("5");
        });

        it("Update with exclusive fields modify and read permission", async () => {
            const permission = { readFields: { counter: 0 }, modifyFields: { string: 0 } };
            const result = await model.updateOne({ id: instances[0]._id }, { counter: 10, string: "5" }, permission);
            expect(result.counter).not.to.be.ok;
            expect(result.string).to.equal("0");
            const saved = await Entry.findOne({ _id: instances[0]._id }).lean();
            expect(saved.counter).to.equal(10);
            expect(saved.string).to.equal("0");
        });

        it("Update with inclusive fields modify and read permission", async () => {
            const permission = { readFields: { counter: 1 }, modifyFields: { string: 1 } };
            const result = await model.updateOne({ id: instances[0]._id }, { counter: 10, string: "5" }, permission);
            expect(result.counter).to.equal(0);
            expect(result.string).not.to.be.ok;
            const saved = await Entry.findOne({ _id: instances[0]._id }).lean();
            expect(saved.counter).to.equal(0);
            expect(saved.string).to.equal("5");
        });

    });

    describe("Delete one", () => {
        
        let instance;

        beforeEach(async () => {
            await populateDatabase(1);
            instance = await Entry.findOne({}).lean();
        });
        afterEach(cleanDatabase);

        it("Simple delete", async () => {
            const result = await model.deleteOne({ id: instance._id });
            expect(result).to.be.ok;
            expect(result.counter).to.equal(0);
            const deleted = await Entry.findOne({ _id: instance._id });
            expect(deleted).not.to.be.ok;
        });

        it("Delete denied entry", async () => {
            const permission = { filter: { counter: 10 } };
            const result = await model.deleteOne({ id: instance._id }, permission);
            expect(result).not.to.be.ok;
            const deleted = await Entry.findOne({ _id: instance._id });
            expect(deleted).to.be.ok;
        });

        it("Delete allowed entry", async () => {
            const permission = { filter: { counter: 0 } };
            const result = await model.deleteOne({ id: instance._id }, permission);
            expect(result).to.be.ok;
            const deleted = await Entry.findOne({ _id: instance._id });
            expect(deleted).not.to.be.ok;
        });

        it("Delete with exclusive read projection", async () => {
            const permission = { readFields: { counter: 0 } };
            const result = await model.deleteOne({ id: instance._id }, permission);
            expect(result).to.be.ok;
            expect(result.counter).not.to.be.ok;
            expect(result.string).to.be.ok;
            const deleted = await Entry.findOne({ _id: instance._id });
            expect(deleted).not.to.be.ok;
        });

    });

});