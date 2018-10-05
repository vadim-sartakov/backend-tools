import { Schema } from "mongoose";

const emailSchema = new Schema({
    email: {
        type: String,
        match: /^.+@.+\..+$/,
        required: true,
        unique: true,
        lowercase: true
    },
    confirmedAt: Date
});

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
        type: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
        notEmpty: true
    },
    emails: {
        type: [emailSchema],
        notEmpty: true
    }
}, { timestamps: true });

export default userSchema;