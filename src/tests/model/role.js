import { Schema } from "mongoose";

export const roleSchema = () => new Schema({
    key: String,
    description: String,
    permissions: Schema.Types.Mixed
});

export const admin = { key: "ADMIN", description: "Admin description" };
export const moderator = { key: "MODERATOR", description: "Moderator description" };
export const user = {
    key: "USER",
    description: "User description",
    permissions: {
        models: {
            User: {
                filter: { number: 5 },
                projection: {
                    read: "",
                    update: ""
                }
            }
        },
        paths: {
            "/secured": {}
        }
    }
};