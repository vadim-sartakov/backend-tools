import mongoose from "mongoose";
import userSchema from "./user";
import {
    localSchema,
    oAuth2AccountSchema,
    windowsAccountSchema
} from "./account";

const loadModels = () => {
    mongoose.model("LocalAccount", localSchema);
    mongoose.model("OAuth2Account", oAuth2AccountSchema);
    mongoose.model("WindowsAccount", windowsAccountSchema);
    mongoose.model("User", userSchema);
};
export default loadModels;