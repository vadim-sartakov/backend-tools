import { Schema } from "mongoose";

export const accountSchema = new Schema({
    type: {
        type: String,
        required: true,
        lowercase: true
    },
    id: {
        type: String,
        required: true,
        // Should be customizable property
        lowercase: true
    },
    username: String
}, { _id: false });
accountSchema.index({ type: 1, id: 1 }, { unique: true });