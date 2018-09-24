import mongoose from "mongoose";
import { userSchema } from "./user";
import { roleSchema } from "./role";
import { departmentSchema } from "./department";

export const loadModels = () => {
    mongoose.model("User", userSchema);
    mongoose.model("Role", roleSchema);
    mongoose.model("Department", departmentSchema);
};