import mongoose from "mongoose";
import userSchema from "./user";
import {
    usernameSchema,
    emailSchema,
    phoneNumberSchema,
    oAuth2AccountSchema,
    windowsAccountSchema
} from "./account";

const loadModels = () => {
    mongoose.model("UsernameAccount", usernameSchema);
    mongoose.model("EmailAccount", emailSchema);
    mongoose.model("PhoneNumberAccount", phoneNumberSchema);
    mongoose.model("OAuth2Account", oAuth2AccountSchema);
    mongoose.model("WindowsAccount", windowsAccountSchema);
    mongoose.model("User", userSchema);
};
export default loadModels;