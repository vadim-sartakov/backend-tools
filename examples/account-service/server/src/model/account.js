import { Schema } from "mongoose";

const account = {
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    confirmedAt: Date
};

export const localSchema = new Schema({
    ...account,
    username: {
        type: String,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    }
}, { collection: "localAccounts" });

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
}, { collection: "oAuth2Accounts" });
oAuth2AccountSchema.index({ provider: 1, profileId: 1 });

export const windowsAccountSchema = new Schema({
    ...account,
    username: String,
    userSid: {
        type: String,
        required: true,
        unique: true
    },
    groups: [String],
}, { collection: "windowsAccounts" });