export const translateMessages = (req, err) => {
    Object.keys(err.errors).forEach(key => {
        let errorKey = err.errors[key];
        if (errorKey.kind === "unique") {
            errorKey.message = req.__(`validation.unique.${req.originalUrl.replace("/", "")}.${errorKey.path}`);
        } else {
            errorKey.message = req.__(errorKey.message);
        }
    });
};

export const errorHandler = (req, res, next) => err => {
    if (err.name === 'ValidationError') {
        translateMessages(req, err);
        res.status(400).json({ message: err.message, errors: err.errors });
    }
    // Not found
    else if (err.name === 'CastError') {
        next();
    } else {
        next(err);
    }
};

export const getAll = query => (req, res, next) => {
    query(req)
        .then(instance => res.json(instance))
        .catch(errorHandler(req, res, next));
};

export const getOne = query => (req, res, next) => {
    query(req)
        .then(instance => instance ? res.json(instance) : next())
        .catch(errorHandler(req, res, next));
};

export const getLocation = (req, id) => `${req.protocol}://${req.get('host')}${req.originalUrl}/${id}`;

export const addOne = query => (req, res, next) => {
    query(req)
        .then(instance => res.status(201).location(getLocation(req, instance._id)).json(instance))
        .catch(errorHandler(req, res, next));
};

export const deleteOne = query => (req, res, next) => {
    query(req)
        .then(instance => instance ? res.status(204).send() : next())
        .catch(errorHandler(req, res, next));
};

export const updateOne = query => (req, res, next) => {
    query(req)
        .then(() => res.status(204).send())
        .catch(errorHandler(req, res, next));
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
    getAll: getAll(() => Model.find({ })),
    addOne: addOne(req => new Model(req.body).save()),
    getOne: getOne(req => Model.findById(req.params.id)),
    updateOne: updateOne(req => Model.findByIdAndUpdate(req.params.id, req.body, { runValidators: true, context: 'query' })),
    deleteOne: deleteOne(req => Model.findByIdAndDelete(req.params.id))
});