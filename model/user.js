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

export default mongoose.model("Users", UserSchema);