import mongoose from "mongoose";
import userSchema from "./user";
import roleSchema from "./role";

const loadModels = () => {
    mongoose.model("User", userSchema);
    mongoose.model("Role", roleSchema);
};

export default loadModels;