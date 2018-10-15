import { Schema } from "mongoose";
import { localSchema, windowsAccountSchema, oAuth2AccountSchema } from "./account";

const userSchema = new Schema({
    blocked: {
        type: Boolean,
        default: false
    },
    roles: {
        type: [{ type: String }],
        notEmpty: true
    },
    accounts: {
        local: [localSchema],
        oAuth2: [oAuth2AccountSchema],
        windows: [windowsAccountSchema]
    }
}, { timestamps: true, security: {
    "USER": { create: true, read: true, update: true, delete: true }
} });

export default userSchema;