import { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const account = {
    confirmedAt: Date
};

export const localSchema = new Schema({
    ...account,
    username: {
        type: String,
        required: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true
    }
});
localSchema.virtual("password").set(function(password) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    this.passwordHash = hash;
});
localSchema.index({ username: 1 }, { unique: true, sparse: true });

export const windowsAccountSchema = new Schema({
    ...account,
    username: String,
    userSid: {
        type: String,
        required: true
    },
});
windowsAccountSchema.index({ userSid: 1 }, { unique: true, sparse: true });

export const oAuth2AccountSchema = new Schema({
    ...account,
    provider: {
        type: String,
        required: true
    },
    profileId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    }
});
oAuth2AccountSchema.index({ provider: 1, profileId: 1 }, { unique: true, sparse: true });