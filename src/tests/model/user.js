import { Schema } from "mongoose";
import { addSchema } from "./loader";
import { roleSchema } from "./role"; // eslint-disable-line no-unused-vars
import { departmentSchema } from "./department"; // eslint-disable-line no-unused-vars

export const userSchema = new Schema({
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
    number: Number,
    email: {
        type: String,
        lowercase: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        unique: true
    },
    createdAt: Date,
    roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    department: { type: Schema.Types.ObjectId, ref: "Department" }
}, { versionKey: false });

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

addSchema("User", userSchema);

export const bill = { firstName: "Bill", lastName: "Gates" };
export const filter = (req, res) => res.locals.user.roles.indexOf("USER") !== -1 && { number: 5 };

export const projection = {
    list: () => "firstName lastName department",
    entry: (req, res) => res.locals.user.roles.indexOf("USER") !== -1 && "-phoneNumber"
};