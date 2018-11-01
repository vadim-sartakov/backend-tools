import { Schema } from "mongoose";
import { notEmptyArray } from "../utils/validator";
import { accountValidators, accountTranslations, accountMongooseSchema } from "./account";

export const userSecurity = {
    "ADMIN": { modify: { fields: {  } } },
    "MODERATOR": {},
    "ALL": { 
        read: {
            fields: { password: 0 },
            where: (req, res) => ({ user: res.locals.user })
        }
    }
};

export const userValidators = {
    accounts: [ accountValidators ],
    disabled: {},
    roles: {},
    password: {},
    requirePasswordChange: {}
};

export const userTranslations = {
    accounts: [accountTranslations],
    disabled: {
        en: "Disabled",
        ru: "Отключен"
    },
    roles: {
        en: "Roles",
        ru: "Роли"
    },
    password: {
        en: "Password",
        ru: "Пароль"
    },
    requirePasswordChange: {
        en: "Require password change",
        ru: "Требовать изменение пароля"
    }
};

export const userMongooseSchema = new Schema({
    accounts: [accountMongooseSchema],
    disabled: {
        type: Boolean,
        default: false,
        required: true
    },
    roles: {
        type: [{ type: String }],
        validate: notEmptyArray
    },
    password: String,
    requirePasswordChange: Boolean
},
{ timestamps: true,
security: {
    "ALL": { create: true, read: { projection: "-password" }, update: { projection: "-password" }, delete: true }
},
populateProjection: "-password" });