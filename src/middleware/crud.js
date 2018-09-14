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
        const messageParts = errorKey.message.split("-");

        if (messageParts.length !== 2) return;

        const namespace = `model.${res.locals.modelName}`;
        const [ field, validationType ] = messageParts;
        const fieldName = req.t(`${namespace}:${field}.name`);
        
        // Custom field message or general
        errorKey.message = req.t([`${namespace}:${field}.validation.${validationType}`, `validation:${validationType}`], { fieldName });

    });

};

export default crudValidationMiddleware;