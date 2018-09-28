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
    const managerReadProjection = "-amount";
    const managerModifyProjection = "-number";

    const detailsSchema = new Schema({ description: String, amount: Schema.Types.Decimal128, budgetItem: String });
    const invoiceSchema = new Schema({
        number: Number,
        order: { date: Date, number: String },
        amount: Schema.Types.Decimal128,
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

            },
            [MODERATOR]: { create: true, read: true, update: true, delete: true },
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
            const user = { roles: [INVENTORY_MANAGER] };
            await expect(createInvoice(createdId).setOptions({ user }).save()).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By user with suitable role", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const saved = await createInvoice(createdId).setOptions({ user }).save();
            const savedFromDb = await Invoice.findOne({ _id: saved.id });
            expect(savedFromDb).to.have.property("number", undefined);
        });

        it("By user with combination of roles", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
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
            const user = { roles: [INVENTORY_MANAGER] };
            await expect(Invoice.find().setOptions({ user })).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By user with suitable role", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoices = await Invoice.find().setOptions({ user });
            expect(invoices.length).to.equal(10);
            expect(invoices[0]._doc).not.to.have.property("amount");
        });

        it("By user with combination of roles", async () => {
            const user = { roles: [SALES_MANAGER, MODERATOR], department: depOne };
            const invoices = await Invoice.find().setOptions({ user });
            expect(invoices.length).to.equal(20);
            expect(invoices[0]._doc).to.have.property("amount");
        });

        it("By user with filter to allowed department", async () => {
            const user = { roles: [SALES_MANAGER], department: depOne };
            const invoices = await Invoice.find({ department: depOne }).setOptions({ user });
            expect(invoices.length).to.equal(10);
            expect(invoices[0]._doc).not.to.have.property("amount");
        });

        it("By user with filter to prohibited department", async () => {
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