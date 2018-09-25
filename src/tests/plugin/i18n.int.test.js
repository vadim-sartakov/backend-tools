import env from "../../config/env"; // eslint-disable-line no-unused-vars
import mongoose from "mongoose";
import { createI18n } from '../../middleware/i18n';
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiSubset from "chai-subset";
import i18nPlugin from "../../plugin/i18n";
import { loadModels } from "../model/loader";
import { userTranslations } from "../model/user";

chai.use(chaiSubset);
chai.use(chaiAsPromised);

mongoose.plugin(i18nPlugin);
mongoose.set("debug", true);

loadModels();

const User = mongoose.model("User");
const i18n = createI18n();
i18n.addResourceBundle("en", "model.User", userTranslations);

describe("I18n plugin", () => {

    before(async () => {
        await mongoose.connect(`${process.env.DB_URL}/i18nPluginTest`, { useNewUrlParser: true });
    });
    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close(true);
    });

    const dropUsers = async () => await User.deleteMany({ });
    beforeEach(dropUsers);
    afterEach(dropUsers);

    it("Validation error", async () => {
        const user = new User({ });
        await expect(user.localizedSave(i18n)).to.eventually.rejectedWith("Validation failed")
            .and.containSubset({
                errors: {
                    firstName: { message: "`First name` is required" },
                    lastName: { message: "`Last name` is required custom" }
                }
            });
    });

});