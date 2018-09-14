import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    firstName: {
        type: String,
        required: true,
        match: /^\w+$/
    },
    lastName: {
        type: String,
        required: true,
        match: /^\w+$/
    },
    email: {
        type: String,
        lowercase: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        unique: true
    }
}, { versionKey: false, collection: "crud_test_users" });

export const userTranslations = {
    firstName: {
        name: "First name"
    },
    lastName: {
        name: "Last name",
        validation: {
            required: "Last name required custom",
            match: "Last name is invalid custom"
        }
    },
    email: {
        name: "Email"
    },
    phoneNumber: {
        name: "Phone number",
        validation: {
            unique: "Phone number is not unique custom"
        }
    }
};

const User = mongoose.model("User", userSchema);
export default User;