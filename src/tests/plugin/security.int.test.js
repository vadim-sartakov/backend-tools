import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose, { Schema } from "mongoose";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import security from "../../plugin/security";

chai.use(chaiAsPromised);
mongoose.set("debug", true);

describe("Security plugin", () => {

    const ADMIN = "ADMIN";

    const SALES_MANAGER = "SALES_MANAGER";
    const INVENTORY_MANAGER = "INVENTORY_MANAGER";
    const ACCOUNTANT = "ACCOUNTANT";
    const MODERATOR = "MODERATOR";

    const entryCount = 20;
    const departmentSchema = new Schema({ name: String, address: String, number: Number });

    const managerFilter = user => ({ department: user.department });
    const managerReadProjection = "-number -budget.item -details.account";

    const managerModifyProjection = "-number -budget.item -details.account";
    const accountantModifyProjection = "number budget.item details.account";

    const orderSchema = new Schema({ number: String });
    const detailsSchema = new Schema({ description: String, amount: Number, account: String });
    const invoiceSchema = new Schema({
        number: Number,
        budget: { item: String },
        amount: Number,
        department: { type: Schema.Types.ObjectId, ref: "Department" },
        details: [detailsSchema]
    }, {
        security: {
            [SALES_MANAGER]: {
                create: { projection: managerModifyProjection },
                read: { where: managerFilter, projection: managerReadProjection },
                update: { where: managerFilter, projection: managerModifyProjection },
                delete: { where: managerFilter, projection: managerReadProjection }
            },
            [ACCOUNTANT]: {
                read: true,
                update: { projection: accountantModifyProjection }
            },
            [MODERATOR]: { create: true, read: true, update: true, delete: true },
        }
    });

    let connection, Department, Invoice, depOne, depTwo;

    const createDepartment = number => new Department({ name: `Department ${number}`, address: "Some address", number });
    const createInvoice = (number, department) => new Invoice({
        number,
        budget: { item: "102-5" },
        amount: 100,
        department,
        details: [
            { description: "Entry one", amount: 5, account: "1" },
            { description: "Entry two", amount: 2, account: "2" },
            { description: "Entry three", amount: 8, account: "3" },
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

        it("By inventory manager", async () => {
            const user = { roles: [INVENTORY_MANAGER] };
            await expect(createInvoice(createdId).setOptions({ user }).save()).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By manager of department one", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const saved = await createInvoice(createdId).setOptions({ user }).save();
            const savedFromDb = await Invoice.findOne({ _id: saved.id });
            expect(savedFromDb._doc).not.to.have.property("number");
            expect(savedFromDb._doc).not.to.have.nested.property("budget.item");
            expect(savedFromDb._doc).not.to.have.nested.property("details[0]._doc.account");
        });

        it("By user as combination of manager and moderator", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
            const saved = await createInvoice(createdId).setOptions({ user }).save();
            const savedFromDb = await Invoice.findOne({ _id: saved.id });
            expect(savedFromDb._doc).to.have.property("number");
            expect(savedFromDb._doc).to.have.nested.property("budget.item");
            expect(savedFromDb._doc).to.have.nested.property("details[0]._doc.account");
        });

    });

    describe("Read", () => {

        it("By admin", async () => {
            const user = { roles: [ADMIN] };
            const invoices = await Invoice.find().setOptions({ user });
            expect(invoices.length).to.equal(entryCount);
            const invoice = invoices[0]._doc;
            expect(invoice).to.have.property("number");
            expect(invoice).to.have.nested.property("budget.item");
            expect(invoice).to.have.nested.property("details[0]._doc.account");
        });

        it("By inventory manager", async () => {
            const user = { roles: [INVENTORY_MANAGER] };
            await expect(Invoice.find().setOptions({ user })).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By manager of department 1", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoices = await Invoice.find().setOptions({ user });
            expect(invoices.length).to.equal(10);
            const invoice = invoices[0]._doc;
            expect(invoice).not.to.have.property("number");
            expect(invoice).not.to.have.nested.property("budget.item");
            expect(invoice).not.to.have.nested.property("details[0]._doc.account");
        });

        it("By user as combination of manager and moderator", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
            const invoices = await Invoice.find().setOptions({ user });
            expect(invoices.length).to.equal(20);
            const invoice = invoices[0]._doc;
            expect(invoice).to.have.property("number");
            expect(invoice).to.have.nested.property("budget.item");
            expect(invoice).to.have.nested.property("details[0]._doc.account");
        });

        it("By manager of department one with filter", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoices = await Invoice.find({ department: depOne }).setOptions({ user });
            expect(invoices.length).to.equal(10);
            const invoice = invoices[0]._doc;
            expect(invoice).not.to.have.property("number");
            expect(invoice).not.to.have.nested.property("budget.item");
            expect(invoice).not.to.have.nested.property("details[0]._doc.account");
        });

        it("Department 2 data by manager of department 1", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
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

    describe("Delete", () => {

        beforeEach(async () => {
            !await Invoice.findOne({ number: 5 }) && await createInvoice(5, depOne).save();
        });

        it("By admin", async () => {
            const user = { roles: [ADMIN] };
            const invoice = await Invoice.findOneAndRemove({ number: 5 }).setOptions({ user });
            expect(invoice).to.be.ok;
        });

        it("By user as combination of manager and moderator", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
            const invoice = await Invoice.findOneAndRemove({ number: 5 }).setOptions({ user });
            expect(invoice).to.be.ok;
        });

        it("Department one invoice by manager of department 1", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoice = await Invoice.findOneAndRemove({ number: 5 }).setOptions({ user });
            expect(invoice).to.be.ok;
        });

        it("Department one invoice by manager of department 2", async () => {
            const user = { roles: [SALES_MANAGER], department: depTwo };
            const invoice = await Invoice.findOneAndRemove({ number: 5 }).setOptions({ user });
            expect(invoice).not.to.be.ok;
        });
    
    });

});