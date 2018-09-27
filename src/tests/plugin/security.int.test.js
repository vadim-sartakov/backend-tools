import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose, { Schema } from "mongoose";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import security from "../../plugin/security";

chai.use(chaiAsPromised);
mongoose.set("debug", true);

describe("Security plugin", () => {

    const entryCount = 20;
    const departmentSchema = new Schema({ name: String, address: String, number: Number });

    let connection, Department, res;

    const adminRoleKey = "ADMIN";
    const depOneRoleKey = "DEP_ONE";
    const depTwoRoleKey = "DEP_TWO";

    const roles = {
        [depOneRoleKey]: {
            description: "Department one users",
            permissions: {
                model: {
                    Department: {
                        filter: { number: 5 }
                    },
                    projection: {
                        write: "name"
                    }
                }
            }
        },
        [depTwoRoleKey]: {
            description: "Department two users",
            permissions: {
                model: {
                    Department: {
                        filter: { number: 6 }
                    },
                    projection: "-address"
                }
            }
        }
    };

    const populateDatabase = async () => {
        for (let i = 0; i < entryCount; i++) {
            await new Department({ name: `Department ${i}`, address: "Some address", number: i }).save();
        }
    };

    before(async () => {
        connection = await mongoose.createConnection(`${process.env.DB_URL}/securityPluginTest`, { useNewUrlParser: true });
        departmentSchema.plugin(security);
        Department = connection.model("Department", departmentSchema);
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

        it("Anonimous", async () => {
            await expect(Department.find()).to.eventually.rejectedWith("No response was specified");
            await expect(Department.find().setOptions({ res })).to.eventually.rejectedWith("No user found in response locals");
        });

        it("No roles specified", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            await expect(Department.find().setOptions({ res })).to.eventually.rejectedWith("No roles was specified");
        });

    });

    describe("Find", () => {

        it("By admin", async () => {
            res.locals.user = { roles: [adminRoleKey] };
            const departments = await Department.find().setOptions({ res, roles });
            expect(departments.length).to.equal(entryCount);
        });

        it("By user of department one, no filter", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const departments = await Department.find().setOptions({ res, roles });
            expect(departments.length).to.equal(1);
            expect(departments[0]).to.have.property("number", 5);
        });

        it("By user of department one with filter to allowed department", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const departments = await Department.find({ number: 5 }).setOptions({ res, roles });
            expect(departments.length).to.equal(1);
            expect(departments[0]).to.have.property("number", 5);
        });

        it("By user of department one with filter to prohibited department", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const departments = await Department.find({ number: 6 }).setOptions({ res, roles });
            expect(departments.length).to.equal(0);
        });

        it("By user of department one and two without filter", async () => {
            res.locals.user = { roles: [depOneRoleKey, depTwoRoleKey] };
            const departments = await Department.find().sort({ number: 1 }).setOptions({ res, roles });
            expect(departments.length).to.equal(2);
            expect(departments[0]).to.have.property("number", 5);
            expect(departments[1]).to.have.property("number", 6);
        });

        it("By user of department one and two with filter", async () => {
            res.locals.user = { roles: [depOneRoleKey, depTwoRoleKey] };
            const departments = await Department.find({ number: 5 }).sort({ number: 1 }).setOptions({ res, roles });
            expect(departments.length).to.equal(1);
            expect(departments[0]).to.have.property("number", 5);
        });
    
    });

    describe("Find one", () => {

        it("By admin", async () => {
            res.locals.user = { roles: [adminRoleKey] };
            const department = await Department.findOne({ number: 6 }).setOptions({ res, roles });
            expect(department).to.be.ok;
        });

        it("By user of department one and filter to allowed department", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOne({ number: 5 }).setOptions({ res, roles });
            expect(department).to.be.ok;
        });

        it("By user and filter to prohibited department", async () => {
            res.locals.user = { roles: [depOneRoleKey] };
            const department = await Department.findOne({ number: 6 }).setOptions({ res, roles });
            expect(department).not.to.be.ok;
        });
    
    });

});