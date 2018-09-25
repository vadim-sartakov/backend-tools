import { eachPathRecursive } from "./utils";

const translateHandler = ({ path, modelName, i18n, opts: { translatePath } }) => validator => {

    const { type } = validator;
    const namespace = `model.${modelName}`;

    // Custom field message or general
    validator.message = i18n.t([`${namespace}:${path}.validation.${type}`, `validation:${type}`]);

    if (!translatePath) return;
    
    const translatedPath = i18n.t(`${namespace}:${path}.name`);
    validator.message = validator.message.replace("{PATH}", translatedPath);

};

const translateMessages = ({ err, i18n, modelName, opts }) => {

    Object.keys(err.errors).forEach(key => {

        const errorKey = err.errors[key];
        const namespace = `model.${modelName}`;
        const { path, kind } = errorKey;
        
        // Custom field message or general
        errorKey.message = i18n.t([`${namespace}:${path}.validation.${kind}`, `validation:${kind}`]);

        if (opts.translatePath) {
            const fieldName = i18n.t(`${namespace}:${path}.name`);
            errorKey.message = errorKey.message.replace("{PATH}", fieldName);
        }

    });

    err.message = i18n.t("validation:default");
    return err;

};

const defaultOptions = { translatePath: true };

const i18n = (schema, opts = defaultOptions) => {
    schema.methods.localizedSave = async function(i18n) {
        const { modelName } = this.constructor;
        try {
            await this.save();
        } catch (err) {
            if (err.name !== "ValidationError") throw err;
            const translatedError = translateMessages({ err, i18n, modelName, opts });
            throw translatedError;
        }
    };
};

export default i18n;