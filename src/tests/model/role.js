import mongoose, { Schema } from "mongoose";

const roleSchema = new Schema({
    key: String,
    description: String
});

const Role = mongoose.model("Role", roleSchema);
export const admin = new Role({ key: "ADMIN", description: "Admin description" });
export const moderator = new Role({ key: "MODERATOR", description: "Moderator description" });
export default Role;