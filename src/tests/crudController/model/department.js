import mongoose, { Schema } from "mongoose";

const departmentSchema = new Schema({
    name: String,
    address: String
});

const Department = mongoose.model("Group", departmentSchema);
export const department = { name: "Department name", description: "Department address" };
export default Department;