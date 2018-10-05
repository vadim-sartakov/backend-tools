import { Schema } from "mongoose";

const userSchema = new Schema({
    password: {
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
}, { timestamps: true });

export default userSchema;