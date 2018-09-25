import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose from "mongoose";
import { expect } from "chai";
import autopopulate from "../../plugin/autopopulate";
import { populateDatabase } from "../utils";
import { loadModels } from "../model/loader";

mongoose.set("debug", true);

describe("Autopopulate plugin", () => {

    let connection, User;
    before(async () => {
        connection = await mongoose.createConnection(`${process.env.DB_URL}/autopopulatePluginTest`, { useNewUrlParser: true });
        loadModels(connection, autopopulate);
        User = connection.model("User");
        await populateDatabase(connection, 1, new Date());
    });
    after(async () => {
        await connection.dropDatabase();
        await connection.close(true);
    });

    it("Without select", async () => {
        const user = await User.findOne();
        expect(user.roles[0].key).to.be.ok;
    });

    it("Select without populatable fields", async () => {
        const user = await User.findOne().select("firstName");
        expect(user.roles).not.to.be.ok;
    });

    it("Select with one populated field", async () => {
        const user = await User.findOne().select("firstName roles");
        expect(user.roles).to.be.ok;
        expect(user.roles[0].key).to.be.ok;
        expect(user.department).not.to.be.ok;
    });

    it("Excluding one non-populatable field", async () => {
        const user = await User.findOne().select("-firstName");
        expect(user.roles).to.be.ok;
        expect(user.roles[0].key).to.be.ok;
        expect(user.department).to.be.ok;
    });

    it("Excluding one populatable field", async () => {
        const user = await User.findOne().select("-roles");
        expect(user.roles).not.to.be.ok;
        expect(user.department).to.be.ok;
    });

});