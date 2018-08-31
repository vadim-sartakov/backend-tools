import mongoose, { Schema } from "mongoose";
import uniqueValidator from 'mongoose-unique-validator';

const notEmptyArray = value => value.length > 0;

const emailSchema = new Schema({
    email: {
        type: String,
        match: [/^.+@.+\..+$/, "{PATH}.validation.match"],
        required: "{PATH}.validation.required",
        unique: true,
        lowercase: true
    },
    confirmedAt: Date
});

const userSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: "{PATH}.validation.required",
    },
    password: {
        type: String,
        required: "{PATH}.validation.required"
    },
    blocked: {
        type: Boolean,
        default: false
    },
    roles: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        validate: [notEmptyArray, "{PATH}.validation.array.length"]
    },
    emails: {
        type: [emailSchema],
        validate: [notEmptyArray, "{PATH}.validation.length"]
    },
    externalIds: {
        systemOne: {
            type: String,
            required: "{PATH}.validation.required",
            match: [/^\d+$/, "{PATH}.validation.match"],
            unique: true
        }, 
        systemTwo: {
            type: String
        }
    },
    fieldOne: {
        type: String
    },
    fieldTwo: {
        type: String
    }
}, { timestamps: true });

userSchema.index({ fieldOne: 1, fieldTwo: 1 }, { unique: true });
userSchema.plugin(uniqueValidator, { message: '{PATH}.validation.unique' });
const User = mongoose.model("User", userSchema);

export default User;