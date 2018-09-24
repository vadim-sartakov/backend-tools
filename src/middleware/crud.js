const crudValidationMiddleware = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        res.status(400).json({ message: err.message, errors: err.errors });
    } else if (err.name === 'CastError') { // Not found 
        next();
    } else {
        next(err);
    }
};

export default crudValidationMiddleware;