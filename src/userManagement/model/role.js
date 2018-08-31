import mongoose, { Schema } from "mongoose";
import uniqueValidator from 'mongoose-unique-validator';

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

roleSchema.plugin(uniqueValidator, { message: '{PATH}.validation.unique' });
const Role = mongoose.model("Role", roleSchema);

export default Role;