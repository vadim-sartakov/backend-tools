import mongoose, { Schema } from 'mongoose';

const roleSchema = new Schema({
    key: {
        type: String,
        match: /[A-Z_]+/g,
        unique: true,
        required: "Key required"        
    },
    description: String
});

const Role = mongoose.model("Role", roleSchema);

export default Role;