import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose from "mongoose";
import { expect } from "chai";
import security from "../../plugin/security";
import { populateDatabase } from "../utils";
import { loadModels } from "../model/loader";
import { bill } from "../model/user";

mongoose.set("debug", true);

describe("Security plugin", () => {

    const entryCount = 20;
    const admin = { roles: ["ADMIN"] };
    const user = { roles: ["USER"] };

    let connection, User, expectedUser;
    before(async () => {
        expectedUser = { ...bill, number: 5 };
        delete expectedUser.roles;
        connection = await mongoose.createConnection(`${process.env.DB_URL}/securityPluginTest`, { useNewUrlParser: true });
        loadModels(connection, security);
        User = connection.model("User");
        await populateDatabase(connection, entryCount, new Date());
    });
    after(async () => {
        await connection.dropDatabase();
        await connection.close(true);
    });

    describe("Find", () => {

        it("Without user", async () => {
            const users = await User.find();
            expect(users.length).to.equal(entryCount);
        });

        it("With user, no filter", async () => {
            const users = await User.find().setOptions({ user });
            expect(users.length).to.equal(1);
            const userInstance = users[0];
            expect({ ...userInstance._doc, _id: userInstance.id }).to.deep.equal({ ...expectedUser, _id: userInstance.id });
        });

        it("With user and filter to same user", async () => {
            const users = await User.find({ firstName: "Bill" }).setOptions({ user });
            expect(users.length).to.equal(1);
            const userInstance = users[0];
            expect({ ...userInstance._doc, _id: userInstance.id }).to.deep.equal({ ...expectedUser, _id: userInstance.id });
        });

        it("With user and filter to different user", async () => {
            const users = await User.find({ firstName: "123" }).setOptions({ user });
            expect(users.length).to.be.equal(0);
        });
    
    });

});