import logger from '../config/logger';

export const errorHandler = (res, next) => err => {
    if (err.name === 'ValidationError') {
        res.status(400).json({ message: err.message, errors: err.errors });
    }
    // Not found
    else if (err.name === 'CastError') {
        next();
    } else {
        next(err);
    }
};

export const getAll = (model, projection) => (req, res, next) => {
    logger.log('info', 'requested all entries');
    model.find({ }, projection || "")
        .then(instance => res.json(instance))
        .catch(errorHandler(res, next));
};

export const getOne = model => (req, res, next) => {
    model.findById(req.params.id)
        .then(instance => instance ? res.json(instance) : next())
        .catch(errorHandler(res, next));
};

export const addOne = Model => (req, res, next) => {
    const newInstance = new Model(req.body);
    newInstance.save()
        .then(instance => res.status(201).location(`${req.originalUrl}/${instance._id}`).json(instance))
        .catch(errorHandler(res, next));
};

export const deleteOne = model => (req, res, next) => {
    model.findByIdAndDelete(req.params.id)
        .then(instance => instance ? res.status(204).send() : next())
        .catch(errorHandler(res, next));
};

export const update = model => (req, res, next) => {
    model.findByIdAndUpdate(req.params.id, req.body)
        .then(() => res.status(204).send())
        .catch(errorHandler(res, next));
};

export const bindRoutes = (app, routes) => {
    Object.keys(routes).forEach(path => {
        const route = app.route(path);
        Object.keys(routes[path]).forEach(method => {
            route[method](routes[path][method]);
        });
    });
};

export const routeMap = (path, model) => ({
    [path]: {
        get: getAll(model),
        post: addOne(model)
    },
    [`${path}/:id`]: {
        get: getOne(model),
        put: update(model),
        delete: deleteOne(model)
    }
});