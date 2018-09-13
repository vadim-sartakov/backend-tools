export const crudValidationError = (err, req, res, next) => {
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
        let errorKey = err.errors[key];
        errorKey.message = req.__(`${res.locals.modelName}.${errorKey.message}`);
    });
};