import mongoose from "mongoose";
import userSchema from "./user";

const loadModels = () => {
    mongoose.model("User", userSchema);
};
export default loadModels;