import mongoose, { Schema } from "mongoose";
import uniqueValidator from 'mongoose-unique-validator';

const notEmptyArray = value => value.length > 0;

const userSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: "validation.user.username.required",
    },
    password: {
        type: String,
        required: "validation.user.password.required"
    },
    blocked: {
        type: Boolean,
        default: false
    },
    roles: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        validate: [notEmptyArray, "validation.user.roles.length"]
    },
    emails: {
        type: [ {
            email: {
                type: String,
                match: [/^.+@.+$/, "validation.user.emails.email.match"],
                required: "validation.user.emails.email.required",
                unique: true,
                lowercase: true
            },
            confirmedAt: Date
        } ],
        validate: [notEmptyArray, "validation.user.emails.length"]
    },
    externalIds: {
        systemOne: {
            type: String,
            required: "validation.user.externalIds.systemOne.required",
            match: [/^\d+$/, "validation.user.externalIds.systemOne.match"],
            unique: true
        }, 
        systemTwo: {
            type: String,
            unique: true
        }
    }
}, { timestamps: true });

userSchema.plugin(uniqueValidator, { message: 'validation.user.unique' });
const User = mongoose.model("User", userSchema);

export default User;