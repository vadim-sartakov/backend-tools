"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function translateMessages(err) {

    var i18n = void 0,
        modelName = void 0;
    if (this.constructor.name === "Query") {
        i18n = this.options.i18n;
        modelName = this.model.modelName;
    } else if (this.constructor.name === "model") {
        if (!this._options) return;
        i18n = this._options.i18n;
        modelName = this.constructor.modelName;
    }

    if (!i18n) return;

    Object.keys(err.errors).forEach(function (key) {

        var errorKey = err.errors[key];
        var namespace = "model." + modelName;
        var path = errorKey.path,
            kind = errorKey.kind,
            value = errorKey.value,
            min = errorKey.min,
            max = errorKey.max,
            minLength = errorKey.minLength,
            maxLength = errorKey.maxLength;

        var fieldTranslationKey = namespace + ":" + path + ".name";
        var fieldName = i18n.exists(fieldTranslationKey) && i18n.t(fieldTranslationKey);

        // Custom field message or general
        errorKey.message = i18n.t([namespace + ":" + path + ".validation." + kind, "validation:" + kind], { fieldName: fieldName, value: value, min: min, max: max, minLength: minLength, maxLength: maxLength });
        err.message = i18n.t("validation:default");
    });
}

function errorMiddleware(err, doc, next) {
    // eslint-disable-line no-unused-vars
    err.name === 'ValidationError' && translateMessages.call(this, err);
    next(err);
}

var i18nPlugin = function i18nPlugin(schema) {

    schema.methods.setOptions = function (options) {
        this._options = options;
        return this;
    };

    schema.post("validate", errorMiddleware);
    schema.post("findOneAndUpdate", errorMiddleware);
};

exports.default = i18nPlugin;
//# sourceMappingURL=i18n.js.map