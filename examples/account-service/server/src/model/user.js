import { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { accountSchema } from "./account";

const userSchema = new Schema({
    accounts: [accountSchema],
    blocked: {
        type: Boolean,
        default: false
    },
    roles: {
        type: [{ type: String }],
        notEmpty: true
    },
    password: {
        type: String,
        set: password => bcrypt.hashSync(password, 10)
    }
}, { timestamps: true, security: {
    "ADMIN": { create: true, read: { projection: "-password" }, update: true, delete: true }
} });

export default userSchema;