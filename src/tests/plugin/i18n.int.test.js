import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose from "mongoose";
import i18next from "i18next";
import { expect } from "chai";
import i18nPlugin from "../../plugin/i18n";
import { loadModels } from "../model/loader";
import { userSchema } from "../model/user"; // eslint-disable-line no-unused-vars

mongoose.plugin(i18nPlugin);
mongoose.set("debug", true);

loadModels();

const User = mongoose.model("User");

describe("I18n plugin", () => {

    before(async () => {
        await mongoose.connect(`${process.env.DB_URL}/i18nPluginTest`, { useNewUrlParser: true });
    });
    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close(true);
    });

    it.skip("Validation error", async () => {
        const user = new User({});
        const errorPromise = user.validate();
        const error = await errorPromise;
        expect(error).to.be.ok;
    });

});