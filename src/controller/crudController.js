import { Router } from "express";
import qs from "qs";
import { createModelSetMiddleware } from "../middleware/crud";

/**
 * @callback SecurityCallback
 * @param {Object} req - express request
 * @param {Object} res - express response
 * @return {Object} - condition object
 */

/**
 * @callback ProjectionCallback
 * @param {Object} req - express request
 * @param {Object} res - express response
 * @return {Object} - projection object
 */

/**
 * @callback PopulateCallback
 * @param {Object} req - express request
 * @param {Object} res - express response
 * @return {Array.<string>} - fields to populate.
 */

/**
 * @typedef {Object} Handler
 * @property {SecurityCallback} securityCallback
 * @property {ProjectionCallback} projectionCallback
 * @property {PopulateCallback} populateCallback
 */

/**
 * @typedef {Object} RouteMapOptions
 * @property {SecurityCallback} securityCallback
 * @property {ProjectionCallback} projectionCallback
 * @property {PopulateCallback} populateCallback
 * @property {number} defaultPageSize
 * @property {string} delimeter - filter and sorting delimeter
 * @property {Handler} getAll
 * @property {Handler} addOne
 * @property {Handler} getOne
 * @property {Handler} updateOne
 * @property {Handler} deleteOne
 */

/**
 * Set of express middlewares to handle the route.
 * @typedef {Object} RouteMap
 * @property {Function} getAll
 * @property {Function} addOne
 * @property {Function} getOne
 * @property {Function} updateOne
 * @property {Function} deleteOne
 */

/**
 * @typedef {Object} RouterBinderOption
 * @property {boolean} disabled
 */

/**
 * @typedef {Object} RouterBinderOptions
 * @property {RouterBinderOption} getAll
 * @property {RouterBinderOption} addOne
 * @property {RouterBinderOption} getOne
 * @property {RouterBinderOption} updateOne
 * @property {RouterBinderOption} deleteOne
 */

/**
 * @param {string} modelName - model name to use in i18n middlewares.
 * @param {Object} routeMap - 'Express' middleware set for each method.
 * @param {RouterBinderOptions} opts - bind options
 */
const crudRouter = (modelName, routeMap, opts) => {

    opts = opts || { getAll: {}, addOne: {}, getOne: {}, updateOne: {}, deleteOne: {}};

    const router = Router();

    router.all("/*", createModelSetMiddleware(modelName));

    const rootRouter = router.route("/");
    !opts.getAll.disable && rootRouter.get(routeMap.getAll);
    !opts.addOne.disable && rootRouter.post(routeMap.addOne);

    const idRouter = router.route("/:id");
    !opts.getOne.disable && idRouter.get(routeMap.getOne);
    !opts.updateOne.disable && idRouter.put(routeMap.updateOne);
    !opts.deleteOne.disable && idRouter.delete(routeMap.deleteOne);

    return router;

};

/**
 * @param {Object} Model - mongoose model
 * @param {RouteMapOptions} opts - crud router options
 * @return {RouteMap}
 */
export const createMongooseRouteMap = (Model, opts) => {

    opts = opts || {
        defaultPageSize: 20
    };

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

const createGetAll = (Model, opts) => async (req, res, next) => {

    const delimeter = { delimeter: opts.delimeter || "," };
    opts = getResultOptions(opts, "getAll");
    const { securityCallback, projectionCallback, populateCallback, defaultPageSize } = opts;

    let { page, size, filter, sort } = req.query;
    page = page || 0;
    size = size || defaultPageSize;
    filter = filter && qs(filter, delimeter);
    sort = sort && qs(sort, delimeter);

    const security = securityCallback && projectionCallback(req, res);
    const projection = projectionCallback && projectionCallback(req, res);
    const populate = populateCallback && populateCallback(req, res);

    const condition = [];
    if (security) condition.push(security);
    if (filter) condition.push(filter);

    const query = Model.find({ $and: condition })
        .skip(page * size)
        .limit(size);

    if (projection) query.select(projection);
    if (populate) query.populate(populate);
    if (sort) query.sort(sort);

    const result = await query.exec().catch(next);

    // TODO: pass Link header
    result && res.json(result);

};

const prepareQuery = (opts, method) => {

    opts = getResultOptions(opts, method);

};

const getResultOptions = (opts, method) => ({ ...opts, ...opts[method] });

const createAddOne = (Model, opts) => async (req, res, next) => {

    opts = getResultOptions(opts, "addOne");
    const { projectionCallback } = opts;
    const projection = projectionCallback && projectionCallback(req, res);

    const query = new Model(req.body).save();
    const instance = await query.exec(next).catch(next);

    if (!instance) return;

    const updatedQuery = Model.findById(instance._id);
    if (projection) updatedQuery.select(projection);

    const updatedInstance = await updatedQuery.exec().catch(next);
    if (!updatedInstance) return;

    instance && res.status(201).location(getLocation(req, updatedInstance._id)).json(updatedInstance);

};

const getLocation = (req, id) => `${req.protocol}://${req.get('host')}${req.originalUrl}/${id}`;

const createGetOne = (Model, opts) => async (req, res, next) => {
    
    opts = getResultOptions(opts, "getOne");
    const { securityCallback, projectionCallback, populateCallback } = opts;

    const security = securityCallback && projectionCallback(req, res);
    const projection = projectionCallback && projectionCallback(req, res);
    const populate = populateCallback && populateCallback(req, res);

    const condition = [{ _id: req.params.id }];
    if (security) condition.push(security);

    const query = Model.findOne({ $and: condition });
    if (projection) query.select(projection);
    if (populate) query.populate(populate);
    const instance = await query.exec().catch(next);

    instance ? res.json(instance) : next();

};

const createUpdateOne = (Model, opts) => async (req, res, next) => {

    opts = getResultOptions(opts, "updateOne");


};

export default crudRouter;