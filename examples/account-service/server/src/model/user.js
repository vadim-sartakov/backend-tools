import { Schema } from "mongoose";

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    blocked: {
        type: Boolean,
        default: false
    },
    roles: {
        type: [{ type: String }],
        notEmpty: true
    }
}, { timestamps: true, security: {
    "USER": { read: true }
} });

export default userSchema;