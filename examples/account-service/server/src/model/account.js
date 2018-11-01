import { Schema } from "mongoose";

export const accountValidators = {
    type: { },
    id: { },
    username: { },
    code: {  },
    disabled: {  }
};

export const accountTranslations = {
    type: {
        en: "Type",
        ru: "Тип"
    },
    id: "ID",
    username: {
        en: "Username",
        ru: "Имя пользователя"
    },
    code: {
        en: "Code",
        ru: "Код"
    },
    disabled: {
        en: "Disabled",
        ru: "Отключен"
    }
};

export const accountMongooseSchema = new Schema({
    type: String,
    id: String,
    username: String,
    code: { type: String, index: true },
    disabled: { type: Boolean, default: false }
}, { _id: false });
accountMongooseSchema.index({ type: 1, id: 1 }, { unique: true });