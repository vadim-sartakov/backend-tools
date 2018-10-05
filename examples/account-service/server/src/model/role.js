import { Schema } from "mongoose";

export const ADMIN = "ADMIN";
export const MODERATOR = "MODERATOR";

const roleSchema = new Schema({
    key: {
        type: String,
        match: /^[A-Z_]+$/,
        unique: true,
        required: true
    },
    description: String
});

export default roleSchema;