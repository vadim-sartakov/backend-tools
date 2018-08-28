import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
    username: {
        type: String,
        required: "Username required"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["created", "blocked"],
        default: "created"
    }
});

const User = mongoose.model("Users", UserSchema);
console.log("Evaluating new User model");

export default User;