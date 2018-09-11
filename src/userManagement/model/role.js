import mongoose, { Schema } from "mongoose";

export const ADMIN = "ADMIN";
export const MODERATOR = "MODERATOR";

const roleSchema = new Schema({
    key: {
        type: String,
        match: [/^[A-Z_]+$/, "{PATH}.validation.match"],
        unique: true,
        required: "{PATH}.validation.required"
    },
    description: String
});

const Role = mongoose.model("Role", roleSchema);

export default Role;