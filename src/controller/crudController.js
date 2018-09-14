import { Router } from "express";

const crudRouter = (Model, opts) => bindRoutes(createRouteMap(Model, opts));

const bindRoutes = routeMap => {

    const router = Router();

    router.route("/")
        .get(routeMap.getAll)
        .post(routeMap.addOne);
    router.route("/:id")
        .get(routeMap.getOne)
        .put(routeMap.updateOne)
        .delete(routeMap.deleteOne);

    return router;

};

const createRouteMap = (Model, opts = {}) => {

    const defaults = {
        getAll: {
            query: () => Model.find({ }),
            onSuccess: (req, res, next, list) => res.json(list)
        },
        addOne: {
            query: req => new Model(req.body).save(),
            onSuccess: (req, res, next, instance) => res.status(201).location(getLocation(req, instance._id)).json(instance)
        },
        getOne: {
            query: req => Model.findById(req.params.id),
            onSuccess: (req, res, next, instance) => instance ? res.json(instance) : next()
        },
        updateOne: {
            query: req => Model.findByIdAndUpdate(
                req.params.id,
                req.body,
                { runValidators: true, context: 'query', new: true }),
            onSuccess: (req, res, next, instance) => instance ? res.status(200).json(instance) : next()
        },
        deleteOne: {
            query: req => Model.findByIdAndDelete(req.params.id),
            onSuccess: (req, res, next, instance) => instance ? res.status(204).send() : next()
        }
    };

    const routeMap = Object.keys(defaults).reduce((prev, cur) => {
        const query = opts[cur] || defaults[cur].query;
        return {...prev, [cur]: getHandler(Model, query, defaults[cur].onSuccess)} ;
    }, {});

    return routeMap;

};

const getLocation = (req, id) => `${req.protocol}://${req.get('host')}${req.originalUrl}/${id}`;

const getHandler = (Model, query, onSuccess) => async (req, res, next) => {
    res.locals.modelName = Model.modelName;
    const result = await query(req, res).catch(next);
    onSuccess(req, res, next, result);
};

export default crudRouter;