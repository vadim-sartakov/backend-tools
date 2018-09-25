import { Schema } from "mongoose";

export const userSchema = () => new Schema({
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
}, {
    versionKey: false,
    security: {
        projection: user => {
            const { roles } = user;
            if (roles.indexOf("USER") !== -1) {
                return "firstName lastName number";
            }
        },
        filter: user => {
            const { roles } = user;
            if (roles.indexOf("USER") !== -1) {
                return { number: 5 };
            }
        }
    }
});

export const userTranslations = {
    firstName: {
        name: "First name"
    },
    lastName: {
        name: "Last name",
        validation: {
            required: "`Last name` is required custom",
            regexp: "`Last name` is invalid custom"
        }
    },
    email: {
        name: "Email"
    },
    phoneNumber: {
        name: "Phone number",
        validation: {
            unique: "`Phone number` is not unique custom"
        }
    }
};

export const bill = { firstName: "Bill", lastName: "Gates", roles: [] };
export const filter = (req, res) => res.locals.user.roles.indexOf("USER") !== -1 && { number: 5 };

export const projection = {
    list: () => "firstName lastName department",
    entry: (req, res) => res.locals.user.roles.indexOf("USER") !== -1 && "-phoneNumber"
};