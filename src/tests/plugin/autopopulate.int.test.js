import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose, { Schema } from "mongoose";
import { expect } from "chai";
import autopopulate from "../../plugin/autopopulate";

mongoose.set("debug", true);

describe("Autopopulate plugin", () => {

    let connection, Role, Department, User;

    const roleSchema = new Schema({ key: String });
    const departmentSchema = new Schema({ name: String });
    const userSchema = new Schema({
        roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
        department: { type: Schema.Types.ObjectId, ref: "Department" }
    });

    const populateDatabase = async () => {
        const role = await new Role({ key: "ADMIN" }).save();
        const department = await new Department({ name: "Department" }).save();
        await new User({ roles: [ role ], department }).save();
    };

    before(async () => {
        userSchema.plugin(autopopulate);
        connection = await mongoose.createConnection(`${process.env.DB_URL}/autopopulatePluginTest`, { useNewUrlParser: true });
        Role = connection.model("Role", roleSchema);
        Department = connection.model("Department", departmentSchema);
        User = connection.model("User", userSchema);
        await populateDatabase();
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