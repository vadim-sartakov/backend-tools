import { Schema } from "mongoose";
import bcrypt from "bcryptjs";

export const localSchema = new Schema({
    confirmedAt: Date,
    username: {
        type: String,
        required: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        set: password => {
            const salt = bcrypt.genSaltSync(10);
            return bcrypt.hashSync(password, salt);
        }
    }
}, { _id: false });
localSchema.index({ username: 1 }, { unique: true, sparse: true });

export const windowsAccountSchema = new Schema({
    username: String,
    userSid: {
        type: String,
        required: true
    },
}, { _id: false });
windowsAccountSchema.index({ userSid: 1 }, { unique: true, sparse: true });

export const oAuth2AccountSchema = new Schema({
    provider: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    }
}, { _id: false });
oAuth2AccountSchema.index({ provider: 1, id: 1 }, { unique: true, sparse: true });