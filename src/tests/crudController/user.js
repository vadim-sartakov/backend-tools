import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        lowercase: true
    }
}, { versionKey: false, collection: "crud_test_users" });

const User = mongoose.model("User", userSchema);
export default User;