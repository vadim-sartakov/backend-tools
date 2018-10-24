import { Schema } from "mongoose";

const authorizationCodeSchema = new Schema({
    authorizationCode: String,
    expiresAt: Date,
    scope: [String],
    uri: String,
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    user: { type: Schema.Types.ObjectId, ref: "User" }
}, { collection: "authorizationCodes" });
authorizationCodeSchema.index({ authorizationCode: 1 });

export default authorizationCodeSchema;