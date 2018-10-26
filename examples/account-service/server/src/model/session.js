import { Schema } from "mongoose";

const sessionSchema = new Schema({
    _id: String,
    session: {
        cookie: Schema.Types.Mixed,
        user: { type: Schema.Types.ObjectId, ref: "User" }
    },
    expires: Date
}, { security: {
    "ALL": { read: { projection: "-session.oauth" } },
    "ADMIN": { delete: true }
} });

export default sessionSchema;