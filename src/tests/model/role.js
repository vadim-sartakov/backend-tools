import { Schema } from "mongoose";

export const roleSchema = () => new Schema({
    key: String,
    description: String
});

export const admin = { key: "ADMIN", description: "Admin description" };
export const moderator = { key: "MODERATOR", description: "Moderator description" };