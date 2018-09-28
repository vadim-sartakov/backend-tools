import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose, { Schema } from "mongoose";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import security from "../../plugin/security";

chai.use(chaiAsPromised);
mongoose.set("debug", true);

describe("Security plugin", () => {

    const ADMIN = "ADMIN";

    const INVOICE_USER_CREATE = "INVOICE_USER_CREATE";
    const INVOICE_USER_READ = "INVOICE_USER_READ";
    const INVOICE_USER_UPDATE = "INVOICE_USER_UPDATE";
    const INVOICE_USER_DELETE = "INVOICE_USER_DELETE";

    const INVOICE_MODERATOR_CREATE = "INVOICE_MODERATOR_CREATE";
    const INVOICE_MODERATOR_READ = "INVOICE_MODERATOR_READ";
    const INVOICE_MODERATOR_UPDATE = "INVOICE_MODERATOR_UPDATE";
    const INVOICE_MODERATOR_DELETE = "INVOICE_MODERATOR_DELETE";

    const entryCount = 20;
    const departmentSchema = new Schema({ name: String, address: String, number: Number });

    const userWhere = user => ({ department: user.department });
    const userReadProjection = "-amount";
    const userModifyProjection = "-number";

    const detailsSchema = new Schema({ description: String, amount: Schema.Types.Decimal128 });
    const invoiceSchema = new Schema({
        number: Number,
        order: { date: Date, number: String },
        amount: Schema.Types.Decimal128,
        department: { type: Schema.Types.ObjectId, ref: "Department" },
        details: [detailsSchema]
    }, {
        security: {
            [INVOICE_USER_CREATE]: { create: { projection: userModifyProjection } },
            [INVOICE_USER_READ]: { read: { where: userWhere, projection: userReadProjection } },
            [INVOICE_USER_UPDATE]: { update: { where: userWhere, projection: userModifyProjection } },
            [INVOICE_USER_DELETE]: { delete: { where: userWhere, projection: userReadProjection } },

            [INVOICE_MODERATOR_CREATE]: { create: true },
            [INVOICE_MODERATOR_READ]: { read: true },
            [INVOICE_MODERATOR_UPDATE]: { update: true },
            [INVOICE_MODERATOR_DELETE]: { delete: true }
        }
    });

    let connection, Department, Invoice, depOne, depTwo;

    const createDepartment = number => new Department({ name: `Department ${number}`, address: "Some address", number });
    const createInvoice = (number, department) => new Invoice({
        number,
        order: {
            date: new Date(),
            number: "987/2"
        },
        amount: "10.23",
        department,
        details: [
            { description: "Entry one", amount: "5.43" },
            { description: "Entry two", amount: "2.01" },
            { description: "Entry three", amount: "8.56" },
        ]
    });
    const populateDatabase = async () => {
        depOne = await createDepartment(0).save();
        depTwo = await createDepartment(1).save();
        for (let i = 0; i < (entryCount / 2); i++) await createInvoice(i, depOne).setOptions({  }).save();
        for (let i = (entryCount / 2); i < entryCount; i++) await createInvoice(i, depTwo).save();
    };

    before(async () => {
        connection = await mongoose.createConnection(`${process.env.DB_URL}/securityPluginTest`, { useNewUrlParser: true });
        invoiceSchema.plugin(security);
        Department = connection.model("Department", departmentSchema);
        Invoice = connection.model("Invoice", invoiceSchema);
        await populateDatabase();
    });
    after(async () => {
        await connection.dropDatabase();
        await connection.close(true);
    });

    describe("Create", () => {

        const createdId = 100;
        afterEach(async () => {
            await Invoice.findOneAndRemove({ number: createdId });
            await Invoice.findOneAndRemove({ number: undefined });
        });

        it("By admin", async () => {
            const user = { roles: [ADMIN] };
            await expect(createInvoice(createdId, depOne).setOptions({ user }).save()).to.be.eventually.fulfilled;
        });

        it("By user with wrong role", async () => {
            const user = { roles: [INVOICE_USER_UPDATE] };
            await expect(createInvoice(createdId).setOptions({ user }).save()).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By user with suitable role", async () => {
            const user = { roles: [INVOICE_USER_CREATE], department: depOne };
            const saved = await createInvoice(createdId).setOptions({ user }).save();
            const savedFromDb = await Invoice.findOne({ _id: saved.id });
            expect(savedFromDb).to.have.property("number", undefined);
        });

        it("By user with combination of roles", async () => {
            const user = { roles: [INVOICE_USER_CREATE, INVOICE_MODERATOR_CREATE], department: depOne };
            const saved = await createInvoice(createdId).setOptions({ user }).save();
            const savedFromDb = await Invoice.findOne({ _id: saved.id });
            expect(savedFromDb).to.have.property("number").and.to.be.ok;
        });

    });

    describe("Read", () => {

        it("By admin", async () => {
            const user = { roles: [ADMIN] };
            const invoices = await Invoice.find().setOptions({ user });
            expect(invoices.length).to.equal(entryCount);
            expect(invoices[0]).to.have.property("number");
            expect(invoices[0]).to.have.property("amount");
        });

        it("By user with wrong role", async () => {
            const user = { roles: [INVOICE_USER_CREATE] };
            await expect(Invoice.find().setOptions({ user })).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By user with suitable role", async () => {
            const user = { roles: [INVOICE_USER_READ], department: depOne };
            const invoices = await Invoice.find().setOptions({ user });
            expect(invoices.length).to.equal(10);
            expect(invoices[0]._doc).not.to.have.property("amount");
        });

        it("By user with combination of roles", async () => {
            const user = { roles: [INVOICE_USER_READ, INVOICE_MODERATOR_READ], department: depOne };
            const invoices = await Invoice.find().setOptions({ user });
            expect(invoices.length).to.equal(20);
            expect(invoices[0]._doc).to.have.property("amount");
        });

        it("By user with filter to allowed department", async () => {
            const user = { roles: [INVOICE_USER_READ], department: depOne };
            const invoices = await Invoice.find({ department: depOne }).setOptions({ user });
            expect(invoices.length).to.equal(10);
            expect(invoices[0]._doc).not.to.have.property("amount");
        });

        it("By user with filter to prohibited department", async () => {
            const user = { roles: [INVOICE_USER_READ], department: depOne };
            const invoices = await Invoice.find({ department: depTwo }).setOptions({ user });
            expect(invoices.length).to.equal(0);
        });
    
    });

    describe.skip("Find one", () => {

        it("By admin", async () => {
            res.locals.user = { roles: [adminRoleKey] };
            const department = await Department.findOne({ number: 6 }).setOptions({ res });
            expect(department).to.be.ok;
        });

        it("By user of department one and filter to allowed department", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOne({ number: 5 }).setOptions({ res });
            expect(department).to.be.ok;
        });

        it("By user and filter to prohibited department", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOne({ number: 6 }).setOptions({ res });
            expect(department).not.to.be.ok;
        });
    
    });

    describe.skip("Update one", () => {

        const diff = { name: "Changed name" };

        it("By admin", async () => {
            res.locals.user = { roles: [adminRoleKey] };
            const department = await Department.findOneAndUpdate(diff).setOptions({ res });
            expect(department).to.be.ok;
        });

        it("Update department one by user of department one", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOneAndUpdate({ number: 5 }, diff).setOptions({ res });
            expect(department).to.be.ok;
        });

        it("Update department two by user of department one", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOneAndUpdate({ number: 6 }, diff).setOptions({ res });
            expect(department).not.to.be.ok;
        });
    
    });

    describe.skip("Add one", () => {

        afterEach(async () => {
            res.locals.user = { roles: [adminRoleKey] };
            await Department.findOneAndRemove({ number: 100 }).setOptions({ res });
        });

        it("By admin", async () => {
            res.locals.user = { roles: [adminRoleKey] };
            await expect(new Department({ number: 100 }).save()).to.be.eventually.fulfilled;
        });

        it("Add department by allowed user", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOneAndRemove({ number: 5 }).setOptions({ res });
            expect(department).to.be.ok;
        });

        it.skip("Add department by restricted user", async () => {
            res.locals.user = { roles: [depTwoRoleKey] };
            const department = await Department.findOneAndRemove({ number: 6 }).setOptions({ res });
            expect(department).not.to.be.ok;
        });
    
    });

    describe.skip("Delete one", () => {

        beforeEach(async () => {
            res.locals.user = { roles: [adminRoleKey] };
            !await Department.findOne({ number: 5 }).setOptions({ res }) && await createDepartment(5);
        });

        it("By admin", async () => {
            res.locals.user = { roles: [adminRoleKey] };
            const department = await Department.findOneAndRemove({ number: 5 }).setOptions({ res });
            expect(department).to.be.ok;
        });

        it("Delete department one by user of department one", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOneAndRemove({ number: 5 }).setOptions({ res });
            expect(department).to.be.ok;
        });

        it("Delete department two by user of department one", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOneAndRemove({ number: 6 }).setOptions({ res });
            expect(department).not.to.be.ok;
        });
    
    });

});