import { Schema } from "mongoose";

export const departmentSchema = () => new Schema({
    name: String,
    address: String
});

export const department = { name: "Department name", description: "Department address" };