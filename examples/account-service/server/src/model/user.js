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
    password: {
        type: String,
        match: /^(?=.*[A-Za-z])(?=.*[0-9])(?=.{6,})/,
        required: true,
        set: password => passwordEncoder.encodeSync(password)
    }
},
{ timestamps: true,
security: {
    "ALL": { create: true, read: { projection: "-password" }, update: true, delete: true }
},
populateProjection: "-password" });

userSchema.virtual("plainPassword").set(function(password) {
    this.password = passwordEncoder.encodeSync(password);
});
userSchema.path("password").validate(function(password) {

});

export default userSchema;