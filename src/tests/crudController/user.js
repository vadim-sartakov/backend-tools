import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    firstName: {
        type: String,
        required: true,
        match: /\w+/
    },
    lastName: {
        type: String,
        required: true,
        match: /\w+/
    },
    email: {
        type: String,
        lowercase: true,
        unique: true
    }
}, { versionKey: false, collection: "crud_test_users" });

export const userLocale = {
    firstName: {
        validation: {
            required: "Name is required"
        }
    }
};

const User = mongoose.model("User", userSchema);
export default User;