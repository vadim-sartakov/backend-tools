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

/*const translateMessages = (err, req, res) => {

    Object.keys(err.errors).forEach(key => {

        const errorKey = err.errors[key];
        const messageParts = errorKey.message.split("-");

        if (messageParts.length !== 7) return;

        const namespace = `model.${res.locals.modelName}`;
        const [ group, type, path, min, max, minLength, maxLength ] = messageParts;
        const fieldName = req.t(`${namespace}:${path}.name`);
        
        // Custom field message or general
        errorKey.message = req.t([`${namespace}:${path}.validation.${type}`, `validation:${group}.${type}`],
            { fieldName, min, max, minLength, maxLength });

    });

};*/

const defaultOptions = { translatePath: true };

const i18n = (schema, opts = defaultOptions) => {

    let superValidate;
    schema.post("init", function(doc) {
        superValidate = doc.superValidate;
    });

    schema.methods.localizedValidate = function() {
        superValidate();
    };

    schema.pre("validate", function() {
        //this.save(opts);
        "".split("");
    });

    /*schema.methods.translateMessages = function(i18n) {
        eachPathRecursive(schema, (path, schemaType) =>
            schemaType.validators.forEach(translateHandler({ path, modelName: this.constructor.modelName, i18n, opts }))
        );
    };
    schema.pre("findOneAndUpdate", function() {
        
    });*/
};

export default i18n;