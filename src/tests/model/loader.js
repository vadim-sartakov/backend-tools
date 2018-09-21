import mongoose from "mongoose";

let schemas = {};

export const addSchema = (name, schema) => schemas = { ...schemas, [name]: schema };
export const loadModels = () => {
    Object.keys(schemas).forEach(key => mongoose.model(key, schemas[key]));
};