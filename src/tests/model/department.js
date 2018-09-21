import { Schema } from "mongoose";
import { addSchema } from "./loader";

const departmentSchema = new Schema({
    name: String,
    address: String
});

addSchema("Department", departmentSchema);

export const department = { name: "Department name", description: "Department address" };