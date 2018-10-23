import { Schema } from "mongoose";

const tokenSchema = new Schema({
    accessToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },
    refreshToken: String,
    refreshTokenExpiresAt: Date,
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    user: { type: Schema.Types.ObjectId, ref: "User" }
});

export default tokenSchema;