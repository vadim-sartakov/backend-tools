import { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const clientSchema = new Schema({
    secret: { type: String, required: true, set: password => bcrypt.hashSync(password, 10) },
    scopes: [{ type: String }],
    grants: [{ type:String }],
    redirectUris: [{ type: String, required: true }]
}, {
    security: {
        "ALL": { create: true, read: true, update: true, delete: true }
    }
});

export default clientSchema;