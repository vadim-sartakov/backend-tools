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

    const where = user => ({ department: user.department });
    const readProjection = "-amount";
    const modifyProjection = "-number";

    const invoiceSchema = new Schema({ number: Number, amount: Schema.Types.Decimal128, department: { type: Schema.Types.ObjectId, ref: "Department" } }, {
        security: {
            [INVOICE_USER_CREATE]: { create: { projection: modifyProjection } },
            [INVOICE_USER_READ]: { read: { where, projection: readProjection } },
            [INVOICE_USER_UPDATE]: { update: { where, projection: modifyProjection } },
            [INVOICE_USER_DELETE]: { delete: { where, projection: readProjection } },

            [INVOICE_MODERATOR_CREATE]: { create: true },
            [INVOICE_MODERATOR_READ]: { read: true },
            [INVOICE_MODERATOR_UPDATE]: { update: true },
            [INVOICE_MODERATOR_DELETE]: { delete: true }
        }
    });

    let connection, Department, Invoice, res, depOne, depTwo;

    const createDepartment = async number => await new Department({ name: `Department ${number}`, address: "Some address", number }).save();
    const createInvoice = async (number, department) => await new Invoice({ number, amount: "10.23", department }).save();
    const populateDatabase = async () => {
        depOne = await createDepartment(0);
        depTwo = await createDepartment(1);
        for (let i = 0; i < (entryCount / 2); i++) await createInvoice(i, depOne);
        for (let i = (entryCount / 2); i < entryCount; i++) await createInvoice(i, depTwo);
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

    beforeEach(() => {
        res = { locals: {} };
    });

    describe("Errors", () => {

        it("No parameters", async () => {
            await expect(Invoice.find()).to.eventually.rejectedWith("No response was specified");
            await expect(Invoice.find().setOptions({ res })).to.eventually.rejectedWith("No user found in response locals");
        });

    });

    describe("Read", () => {

        it("By admin", async () => {
            res.locals.user = { roles: [ADMIN] };
            const invoices = await Invoice.find().setOptions({ res });
            expect(invoices.length).to.equal(entryCount);
            expect(invoices[0]).to.have.property("number");
            expect(invoices[0]).to.have.property("amount");
        });

        it("By user with wrong role", async () => {
            res.locals.user = { roles: [INVOICE_USER_CREATE] };
            await expect(Invoice.find().setOptions({ res })).to.be.eventually.rejectedWith("Access is denied");
        });

        it("By user with suitable role", async () => {
            res.locals.user = { roles: [INVOICE_USER_READ], department: depOne };
            const invoices = await Invoice.find().setOptions({ res });
            expect(invoices.length).to.equal(10);
            expect(invoices[0]._doc).not.to.have.property("amount");
        });

        it("By user with combination of roles", async () => {
            res.locals.user = { roles: [INVOICE_USER_READ, INVOICE_MODERATOR_READ], department: depOne };
            const invoices = await Invoice.find().setOptions({ res });
            expect(invoices.length).to.equal(20);
            expect(invoices[0]._doc).to.have.property("amount");
        });

        it("By user with filter to allowed department", async () => {
            res.locals.user = { roles: [INVOICE_USER_READ], department: depOne };
            const invoices = await Invoice.find({ department: depOne }).setOptions({ res });
            expect(invoices.length).to.equal(10);
            expect(invoices[0]._doc).not.to.have.property("amount");
        });

        it("By user with filter to prohibited department", async () => {
            res.locals.user = { roles: [INVOICE_USER_READ], department: depOne };
            const invoices = await Invoice.find({ department: depTwo }).setOptions({ res });
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