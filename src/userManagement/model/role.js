import mongoose, { Schema } from "mongoose";
import uniqueValidator from 'mongoose-unique-validator';

export const ADMIN = "ADMIN";
export const MODERATOR = "MODERATOR";

const roleSchema = new Schema({
    key: {
        type: String,
        match: [/^[A-Z_]+$/, "validation.role.key.match"],
        unique: true,
        required: "validation.role.key.required"
    },
    description: String
});

roleSchema.plugin(uniqueValidator, { message: 'validation.role.unique' });
const Role = mongoose.model("Role", roleSchema);

export default Role;