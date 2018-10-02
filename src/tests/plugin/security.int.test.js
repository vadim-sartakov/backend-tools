import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose, { Schema } from "mongoose";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiSubset from "chai-subset";
import security from "../../plugin/security";

chai.use(chaiAsPromised);
chai.use(chaiSubset);

mongoose.set("debug", true);

describe("Security plugin", () => {

    const ADMIN = "ADMIN";

    const SALES_MANAGER = "SALES_MANAGER";
    const INVENTORY_MANAGER = "INVENTORY_MANAGER";
    const ACCOUNTANT = "ACCOUNTANT";
    const MODERATOR = "MODERATOR";

    const entryCount = 20;

    const managerFilter = user => ({ department: user.department });
    const managerReadProjection = "-number -budget.item -order.number -details.account";

    const managerModifyProjection = "-number -budget.item -order.number";
    const accountantModifyProjection = "number budget.item order.number";

    const departmentSchema = new Schema({ name: String, address: String, number: Number });
    const orderSchema = new Schema({ number: String });
    const detailsSchema = new Schema({ description: String, amount: Number, account: String });
    const invoiceSchema = new Schema({
        number: Number,
        budget: { item: String },
        order: orderSchema,
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
    const invoiceDoc = {
        budget: { item: "102-5" },
        order: { number: "156/2" },
        amount: 100,
        details: [
            { description: "Entry one", amount: 5, account: "1" },
            { description: "Entry two", amount: 2, account: "2" },
            { description: "Entry three", amount: 8, account: "3" },
        ]
    };

    let connection, Department, Invoice, depOne, depTwo;

    const createDepartment = number => new Department({ name: `Department ${number}`, address: "Some address", number });
    const createInvoice = (number, department) => new Invoice({
        ...invoiceDoc,
        number,
        department
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
            const invoice = await createInvoice(createdId, depOne).setOptions({ user }).save();
            const dbInvoice = await Invoice.findOne({ _id: invoice.id }).setOptions({ lean: true });
            expect(dbInvoice).to.have.property("number");
            expect(dbInvoice).to.have.nested.property("budget.item");
            expect(dbInvoice).to.have.nested.property("order.number");
        });

        it("By inventory manager", async () => {
            const user = { roles: [INVENTORY_MANAGER] };
            await expect(createInvoice(createdId).setOptions({ user }).save()).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By manager of department one", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoice = await createInvoice(createdId).setOptions({ user }).save();
            const dbInvoice = await Invoice.findOne({ _id: invoice.id }).setOptions({ lean: true });
            expect(dbInvoice).not.to.have.property("number");
            expect(dbInvoice).not.to.have.nested.property("budget.item");
            expect(dbInvoice).not.to.have.nested.property("order.number");
        });

        it("By user as combination of manager and moderator", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
            const invoice = await createInvoice(createdId).setOptions({ user }).save();
            const dbInvoice = await Invoice.findOne({ _id: invoice.id }).setOptions({ lean: true });
            expect(dbInvoice).to.have.property("number");
            expect(dbInvoice).to.have.nested.property("budget.item");
            expect(dbInvoice).to.have.nested.property("order.number");
        });

    });

    describe("Read", () => {

        it("By admin", async () => {
            const user = { roles: [ADMIN] };
            const invoices = await Invoice.find().setOptions({ user, lean: true });
            expect(invoices.length).to.equal(entryCount);
            const invoice = invoices[0];
            expect(invoice).to.have.property("number");
            expect(invoice).to.have.nested.property("budget.item");
            expect(invoice).to.have.nested.property("order.number");
            expect(invoice).to.have.nested.property("details[0].account");
        });

        it("By inventory manager", async () => {
            const user = { roles: [INVENTORY_MANAGER] };
            await expect(Invoice.find().setOptions({ user })).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By manager of department 1", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoices = await Invoice.find().setOptions({ user, lean: true });
            expect(invoices.length).to.equal(10);
            const invoice = invoices[0];
            expect(invoice).not.to.have.property("number");
            expect(invoice).not.to.have.nested.property("budget.item");
            expect(invoice).not.to.have.nested.property("order.number");
            expect(invoice).not.to.have.nested.property("details[0].account");
        });

        it("By user as combination of manager and moderator", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
            const invoices = await Invoice.find().setOptions({ user, lean: true });
            expect(invoices.length).to.equal(20);
            const invoice = invoices[0];
            expect(invoice).to.have.property("number");
            expect(invoice).to.have.nested.property("budget.item");
            expect(invoice).to.have.nested.property("order.number");
            expect(invoice).to.have.nested.property("details[0].account");
        });

        it("By manager of department one with filter", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoices = await Invoice.find({ department: depOne }).setOptions({ user, lean: true });
            expect(invoices.length).to.equal(10);
            const invoice = invoices[0];
            expect(invoice).not.to.have.property("number");
            expect(invoice).not.to.have.nested.property("budget.item");
            expect(invoice).not.to.have.nested.property("order.number");
            expect(invoice).not.to.have.nested.property("details[0].account");
        });

        it("Department 2 data by manager of department 1", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoices = await Invoice.find({ department: depTwo }).setOptions({ user });
            expect(invoices.length).to.equal(0);
        });
    
    });

    describe("Find one", () => {

        it("By admin", async () => {
            const user = { roles: [ADMIN] };
            const invoice = await Invoice.findOne({ number: 5 }).setOptions({ user, lean: true });
            expect(invoice).to.have.nested.property("number");
            expect(invoice).to.have.nested.property("budget.item");
            expect(invoice).to.have.nested.property("order.number");
            expect(invoice).to.have.nested.property("details[0].account");
        });

        it("By inventory manager", async () => {
            const user = { roles: [INVENTORY_MANAGER] };
            await expect(Invoice.findOne({ number: 5 }).setOptions({ user })).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By manager of department 1", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoice = await Invoice.findOne({ number: 5 }).setOptions({ user, lean: true });
            expect(invoice).not.to.have.nested.property("number");
            expect(invoice).not.to.have.nested.property("budget.item");
            expect(invoice).not.to.have.nested.property("order.number");
            expect(invoice).not.to.have.nested.property("details[0].account");
        });

        it("By user as combination of manager and moderator", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
            const invoice = await Invoice.findOne({ number: 5 }).setOptions({ user, lean: true });
            expect(invoice).to.have.nested.property("number");
            expect(invoice).to.have.nested.property("budget.item");
            expect(invoice).to.have.nested.property("order.number");
            expect(invoice).to.have.nested.property("details[0].account");
        });

        it("Department 2 data by manager of department 1", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoice = await Invoice.findOne({ department: depTwo }).setOptions({ user });
            expect(invoice).not.to.be.ok;
        });
    
    });

    describe("Update one", () => {

        const diff = {
            number: 200,
            order: { number: "New number" },
            budget: { item: "Item" },
            details: [
                { description: "Entry one updated", amount: 5, account: "100" },
                { description: "Entry two", amount: 2, account: "2" },
                { description: "Entry three", amount: 8, account: "3" },
            ]
        };
        const number = 5;
        let _id;

        before(async () => {
            const updatable = await Invoice.findOne({ number });
            _id = updatable.id;
        });

        afterEach(async () => {
            await Invoice.findOneAndUpdate({ _id }, { ...invoiceDoc, number: 5, department: depOne });
        });

        it("By admin", async () => {
            const user = { roles: [ADMIN] };
            await Invoice.findOneAndUpdate({ _id }, diff).setOptions({ user, lean: true });
            const updated = await Invoice.findOne({ _id });
            expect(updated).to.containSubset(diff);
        });

        it("By inventory manager", async () => {
            const user = { roles: [INVENTORY_MANAGER] };
            await expect(Invoice.findOneAndUpdate({ _id }, diff).setOptions({ user })).to.be.eventually.rejectedWith("Access is denied");
        });

        it("Invoice of department one by manager of department one", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            await Invoice.findOneAndUpdate({ _id }, diff).setOptions({ user });
            const updated = await Invoice.findOne({ _id }).setOptions({ lean: true });
            expect(updated).to.have.nested.property("number", number);
            expect(updated).to.have.nested.property("budget.item", invoiceDoc.budget.item);
            expect(updated).to.have.nested.property("order.number", invoiceDoc.order.number);
        });

        it("Invoice of department two by manager of department one", async () => {
            const user = { roles: [SALES_MANAGER], department: depTwo };
            const invoice = await Invoice.findOneAndUpdate({ _id }, diff).setOptions({ user });
            expect(invoice).not.to.be.ok;
        });

        it("By user as combination of manager and moderator", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
            await Invoice.findOneAndUpdate({ _id }, diff).setOptions({ user, lean: true });
            const updated = await Invoice.findOne({ _id });
            expect(updated).to.containSubset(diff);
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