import { Schema } from "mongoose";
import { passwordEncoder } from "../utils/security";
import { notEmptyArray } from "../utils/validator";

const accountSchema = new Schema({
    type: {
        type: String,
        required: true,
        lowercase: true
    },
    id: {
        type: String,
        required: true,
        // Should be customizable property
        lowercase: true,
    },
    username: String,
    code: { type: String, index: true },
    disabled: { type: Boolean, default: false }
}, { _id: false });
accountSchema.index({ type: 1, id: 1 }, { unique: true });

const userSchema = new Schema({
    accounts: [accountSchema],
    disabled: {
        type: Boolean,
        default: false,
        required: true
    },
    roles: {
        type: [{ type: String }],
        validate: notEmptyArray
    },
    password: String,
    requirePasswordChange: Boolean
},
{ timestamps: true,
security: {
    "ALL": { create: true, read: { projection: "-password" }, update: { projection: "-password" }, delete: true }
},
populateProjection: "-password" });

export default userSchema;