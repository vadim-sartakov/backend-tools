import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose, { Schema } from "mongoose";
import { expect } from "chai";
import security from "../../plugin/security";

mongoose.set("debug", true);

describe.skip("Security plugin", () => {

    const entryCount = 20;
    const departmentSchema = new Schema({ name: String, number: Number });

    let connection, Department;

    const admin = { roles: ["ADMIN"] };
    const userOne = { roles: ["USER_ONE"] };
    const userTwo = { roles: ["USER_TWO"] };

    const userOneRole = {
        key: "USER_ONE",
        permissions: {
            model: {
                Department: {

                }
            }
        }
    };

    const populateDatabase = async () => {
        for (let i = 0; i < entryCount; i++) {
            await new Department({ name: `Department ${i}`, number: i }).save();
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

    describe("Find", () => {

        it("Anonimous", async () => {
            const users = await User.find();
            expect(users.length).to.equal(entryCount);
        });

        it("By admin", async () => {
            const users = await User.find().setOptions({ admin });
            expect(users.length).to.equal(entryCount);
        });

        it("By user, no filter", async () => {
            const users = await User.find().setOptions({ user });
            expect(users.length).to.equal(1);
            const userInstance = users[0];
            expect({ ...userInstance._doc, _id: userInstance.id }).to.deep.equal({ ...expectedUser, _id: userInstance.id });
        });

        it("By user and filter to same user", async () => {
            const users = await User.find({ firstName: "Bill" }).setOptions({ user });
            expect(users.length).to.equal(1);
            const userInstance = users[0];
            expect({ ...userInstance._doc, _id: userInstance.id }).to.deep.equal({ ...expectedUser, _id: userInstance.id });
        });

        it("By user and filter to different user", async () => {
            const users = await User.find({ firstName: "123" }).setOptions({ user });
            expect(users.length).to.be.equal(0);
        });
    
    });

    describe("Find one", () => {

        it("By admin", async () => {
            const userInstance = await User.findOne({ number: 6 }).setOptions({ admin });
            expect(userInstance).to.be.ok;
        });

        it("By user and filter to same user", async () => {
            const userInstance = await User.findOne({ number: 5 }).setOptions({ user });
            expect(userInstance).to.be.ok;
        });

        it("By user and filter to different user", async () => {
            const userInstance = await User.findOne({ number: 6 }).setOptions({ user });
            expect(userInstance).not.to.be.ok;
        });
    
    });

});