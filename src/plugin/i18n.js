function translateMessages(err) {

    let i18n, modelName;
    if (this.constructor.name === "Query") {
        i18n = this.options.i18n;
        modelName = this.model.modelName;
    } else if (this.constructor.name === "model") {
        i18n = this._options.i18n;
        modelName = this.constructor.modelName;
    }

    if (!i18n) return;

    Object.keys(err.errors).forEach(key => {

        const errorKey = err.errors[key];
        const namespace = `model.${modelName}`;
        const { path, kind, value, min, max, minLength, maxLength } = errorKey;
        const fieldTranslationKey = `${namespace}:${path}.name`;
        const fieldName = i18n.exists(fieldTranslationKey) && i18n.t(fieldTranslationKey);
        
        // Custom field message or general
        errorKey.message = i18n.t([`${namespace}:${path}.validation.${kind}`, `validation:${kind}`], { fieldName, value, min, max, minLength, maxLength });
        err.message = i18n.t("validation:default");

    });

}

function errorMiddleware(err, doc, next) { // eslint-disable-line no-unused-vars
    err.name === 'ValidationError' && translateMessages.call(this, err);
    next(err);
}

const i18nPlugin = schema => {

    schema.methods.setOptions = function(options) {
        this._options = options;
        return this;
    };

    schema.post("validate", errorMiddleware);
    schema.post("findOneAndUpdate", errorMiddleware);

};

export default i18nPlugin;