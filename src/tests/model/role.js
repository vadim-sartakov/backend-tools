import { Schema } from "mongoose";
import { addSchema } from "./loader";

const roleSchema = new Schema({
    key: String,
    description: String
});

addSchema("Role", roleSchema);

export const admin = { key: "ADMIN", description: "Admin description" };
export const moderator = { key: "MODERATOR", description: "Moderator description" };