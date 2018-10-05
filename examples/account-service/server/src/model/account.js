import { Schema } from "mongoose";

const account = {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date
};

const password = {
    password: {
        type: String,
        required: true
    },
};

export const usernameSchema = new Schema({
    ...account,
    ...password,
    username: {
        type: String,
        unique: true,
        lowercase: true
    }
}, { collection: "userNameAccounts" });

export const emailSchema = new Schema({
    ...account,
    ...password,
    email: {
        type: String,
        match: /^.+@.+\..+$/,
        required: true,
        unique: true,
        lowercase: true
    },
    object: Schema.Types.Mixed
}, { collection: "emailAccounts" });

export const phoneNumberSchema = new Schema({
    ...account,
    ...password,
    phoneNumber: {
        type: String,
        unique: true
    }
}, { collection: "phoneNumberAccounts" });

export const oAuth2AccountSchema = new Schema({
    ...account,
    service: {
        type: String,
        required: true
    }
}, { collection: "oAuth2Accounts" });

export const windowsAccountSchema = new Schema({
    ...account,
    username: {
        type: String
    },
    userSid: {
        type: String,
        required: true,
        unique: true
    },
    groups: [String],
}, { collection: "windowsAccounts" });