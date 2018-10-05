import { Schema } from "mongoose";

export const accountSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date
});

export const usernameSchema = new Schema({
    userName: {
        type: String,
        unique: true,
        lowercase: true
    }
});

export const emailSchema = new Schema({
    email: {
        type: String,
        match: /^.+@.+\..+$/,
        required: true,
        unique: true,
        lowercase: true
    }
});

export const phoneNumberSchema = new Schema({
    phoneNumber: {
        type: String,
        unique: true
    }
});

export const oAuth2AccountSchema = new Schema({
    service: {
        type: String,
        required: true,
        unique: true
    },
    accessToken: {
        type: String,
        required: true
    }
});

export const activeDirectoryAccountSchema = new Schema({
    userName: {
        type: String,
        unique: true,
        lowercase: true
    },
    userSid: {
        type: String,
        required: true,
        unique: true
    },
    groups: [String],
});