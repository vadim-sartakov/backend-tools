import { Router } from "express";

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

export const getAll = query => (req, res, next) => {
    query(req)
        .then(instance => res.json(instance))
        .catch(next);
};

export const getOne = query => (req, res, next) => {
    query(req)
        .then(instance => instance ? res.json(instance) : next())
        .catch(next);
};

export const addOne = query => (req, res, next) => {
    query(req)
        .then(instance => res.status(201).location(getLocation(req, instance._id)).json(instance))
        .catch(next);
};

export const deleteOne = query => (req, res, next) => {
    query(req)
        .then(instance => instance ? res.status(204).send() : next)
        .catch(next);
};

export const updateOne = query => (req, res, next) => {
    query(req)
        .then(instance => res.status(204).json(instance))
        .catch(next);
};

export const createHandler = (modelName, query, onSuccess, onFail) => (req, res, next) => {
    res.locals.modelName = modelName;
    query(req).then(onSuccess(req, res)).catch(onFail || next);
};

export const getLocation = (req, id) => `${req.protocol}://${req.get('host')}${req.originalUrl}/${id}`;

export const onGetAll = (req, res) => instance => res.json(instance);
export const onAddOne = (req, res) => instance => res.status(201).location(getLocation(req, instance._id)).json(instance);
export const onGetOne = (req, res, next) => instance => instance ? res.json(instance) : next;
export const onUpdateOne = (req, res) => instance => res.status(204).json(instance);
export const onDeleteOne = (req, res, next) => instance => instance ? res.status(204).send() : next;

export const createRouteMap = Model => ({
    getAll: createHandler(Model.modelName, () => Model.find({ }), onGetAll),
    addOne: createHandler(req => new Model(req.body).save()),
    getOne: createHandler(req => Model.findById(req.params.id)),
    updateOne: createHandler(req => Model.findByIdAndUpdate(req.params.id, req.params.body, { runValidators: true, context: 'query' })),
    deleteOne: createHandler(req => Model.findByIdAndDelete(req.params.id))
});

export class HandlerFactory {
    
    constructor(query, onSuccess, onFail) {
        this.query = query;
        this.onSuccess = onSuccess;
        this.onFail = onFail;
    }

    get handler() {
        const { query, onSuccess, onFail } = this;
        const handler = (req, res, next) => {
            res.locals.modelName = modelName;
            query(req).then(onSuccess(req, res)).catch(onFail || next);
        };
        return handler;
    }

}

export class CrudRouter {

    constructor(Model) {
        this.Model = Model;
        this.routeMap = createRouteMap();
    }

    createRouteMap() {
        const { Model } = this;
        return ({
            getAll: createHandler(Model.modelName, () => Model.find({ }), onGetAll),
            addOne: createHandler(req => new Model(req.body).save()),
            getOne: createHandler(req => Model.findById(req.params.id)),
            updateOne: createHandler(req => Model.findByIdAndUpdate(req.params.id, req.params.body, { runValidators: true, context: 'query' })),
            deleteOne: createHandler(req => Model.findByIdAndDelete(req.params.id))
        });
    }

    get router() {

        const { routeMap } = this;
        const router = Router();

        router.route("/")
            .get(routeMap.getAll)
            .post(routeMap.addOne);
        router.route("/:id")
            .get(routeMap.getOne)
            .put(routeMap.updateOne)
            .delete(routeMap.deleteOne);

        return router;

    }

}

export default CrudRouter;