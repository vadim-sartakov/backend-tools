import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    username: {
        type: String,
        required: "Username required"
    },
    password: {
        type: String,
        required: "Password required"
    },
    blocked: {
        type: Boolean,
        default: false
    },
    roles: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: true
});

const User = mongoose.model("User", userSchema);

export default User;