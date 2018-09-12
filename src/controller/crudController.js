import { Router } from "express";

export const crudRouter = (Model, opts) => {
    return bindRoutes({
        ...createRouteMap(Model),
        ...opts
    });
};

export const createRouteMap = Model => ({
    Model,
    getAll: getAll(() => Model.find({ })),
    addOne: addOne(req => new Model(req.body).save()),
    getOne: getOne(req => Model.findById(req.params.id)),
    updateOne: updateOne(
        req => Model.findByIdAndUpdate(
            req.params.id,
            req.body,
            { runValidators: true, context: 'query' }
        )
    ),
    deleteOne: deleteOne(req => Model.findByIdAndDelete(req.params.id))
});

export const getAll = query => (req, res, next) => {
    query(req)
        .then(instance => res.json(instance))
        .catch(errorHandler(req, res, next));
};

export const errorHandler = (req, res, next) => err => {
    res.locals.err = err;
    next();
};

export const addOne = query => (req, res, next) => {
    query(req)
        .then(instance => res.status(201).location(getLocation(req, instance._id)).json(instance))
        .catch(errorHandler(req, res, next));
};

export const getLocation = (req, id) => `${req.protocol}://${req.get('host')}${req.originalUrl}/${id}`;

export const getOne = query => (req, res, next) => {
    query(req)
        .then(instance => instance ? res.json(instance) : next())
        .catch(errorHandler(req, res, next));
};

export const updateOne = query => (req, res, next) => {
    query(req)
        .then(instance => res.status(204).json(instance))
        .catch(errorHandler(req, res, next));
};

export const deleteOne = query => (req, res, next) => {
    query(req)
        .then(instance => instance ? res.status(204).send() : next)
        .catch(errorHandler(req, res, next));
};

export const bindRoutes = routeMap => {

    const router = Router();

    router.route("/*").all(modelSetMiddleware(routeMap.Model.modelName));

    router.route("/")
        .get(routeMap.getAll)
        .post(routeMap.addOne);
    router.route("/:id")
        .get(routeMap.getOne)
        .put(routeMap.updateOne)
        .delete(routeMap.deleteOne);

    router.route("/*").all(validationErrorMiddleware);

    return router;

};

export const modelSetMiddleware = modelName => (req, res, next) => {
    res.locals.modelName = modelName;
    next();
};

export const validationErrorMiddleware = (req, res, next) => {
    const { err } = res.locals;
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