export const translateMessages = (Model, req, err) => {
    Object.keys(err.errors).forEach(key => {
        let errorKey = err.errors[key];
        errorKey.message = req.__(`${Model.modelName}.${errorKey.message}`);
    });
};

export const errorHandler = (Model, req, res, next) => err => {
    if (err.name === 'ValidationError') {
        translateMessages(Model, req, err);
        res.status(400).json({ message: err.message, errors: err.errors });
    }
    // Not found
    else if (err.name === 'CastError') {
        next();
    } else {
        next(err);
    }
};

export const getAll = (modelName, query) => (req, res, next) => {
    query(req)
        .then(instance => res.json(instance))
        .catch(errorHandler(modelName, req, res, next));
};

export const getOne = (modelName, query) => (req, res, next) => {
    query(req)
        .then(instance => instance ? res.json(instance) : next())
        .catch(errorHandler(modelName, req, res, next));
};

export const getLocation = (req, id) => `${req.protocol}://${req.get('host')}${req.originalUrl}/${id}`;

export const addOne = (modelName, query) => (req, res, next) => {
    query(req)
        .then(instance => res.status(201).location(getLocation(req, instance._id)).json(instance))
        .catch(errorHandler(modelName, req, res, next));
};

export const deleteOne = (modelName, query) => (req, res, next) => {
    query(req)
        .then(instance => instance ? res.status(204).send() : next())
        .catch(errorHandler(modelName, req, res, next));
};

export const updateOne = (modelName, query) => (req, res, next) => {
    query(req, res, next)
        .then(() => res.status(204).send())
        .catch(errorHandler(modelName, req, res, next));
};

export const bindRoutes = (app, routes) => {
    app.route(routes.path)
        .get(routes.getAll)
        .post(routes.addOne);
    app.route(`${routes.path}/:id`)
        .get(routes.getOne)
        .put(routes.updateOne)
        .delete(routes.deleteOne);
};

export const routeMap = (path, Model) => ({
    path,
    Model,
    getAll: getAll(Model, () => Model.find({ })),
    addOne: addOne(Model, req => new Model(req.body).save()),
    getOne: getOne(Model, req => Model.findById(req.params.id)),
    updateOne: updateOne(Model, (req, res, next) => {
        return Model.findById(req.params.id)
            .then(instance => {
                if (!instance) next();
                Object.keys(req.body).forEach(key => instance[key] = req.body[key]);
                return instance.save();
            });
        
    }),
    deleteOne: deleteOne(Model, req => Model.findByIdAndDelete(req.params.id))
});