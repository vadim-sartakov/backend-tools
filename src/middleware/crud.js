export const createModelSetMiddleware = modelName => (req, res, next) => {
    res.locals.modelName = modelName;
    next();
};

const crudValidationMiddleware = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        translateMessages(err, req, res);
        res.status(400).json({ message: err.message, errors: err.errors });
    } else if (err.name === 'CastError') { // Not found 
        next();
    } else {
        next(err);
    }
};

export const translateMessages = (err, req, res) => {

    Object.keys(err.errors).forEach(key => {

        const errorKey = err.errors[key];
        const { i18n } = res.locals;
        const namespace = `model.${res.locals.modelName}`;
        const { path, kind, value, min, max, minLength, maxLength } = errorKey;
        const fieldTranslationKey = `${namespace}:${path}.name`;
        const fieldName = i18n.exists(fieldTranslationKey) && i18n.t(fieldTranslationKey);
        
        // Custom field message or general
        errorKey.message = i18n.t([`${namespace}:${path}.validation.${kind}`, `validation:${kind}`], { fieldName, value, min, max, minLength, maxLength });
        err.message = i18n.t(`${namespace}.default`);

    });

};

export default crudValidationMiddleware;