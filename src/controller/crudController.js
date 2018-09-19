import { Router } from "express";
import querystring from "querystring";
import qs from "qs";
import LinkHeader from "http-link-header";
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
 * @property {boolean} disable
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
 * @param {string} modelName - model name to use in i18n middlewares.
 * @param {Object} routeMap - 'Express' middleware set for each method.
 */
const crudRouter = (modelName, routeMap) => {

    const router = Router();

    router.all("/*", createModelSetMiddleware(modelName));

    const rootRouter = router.route("/");
    routeMap.getAll && rootRouter.get(routeMap.getAll);
    routeMap.addOne && rootRouter.post(routeMap.addOne);

    const idRouter = router.route("/:id");
    routeMap.getOne && idRouter.get(routeMap.getOne);
    routeMap.updateOne && idRouter.put(routeMap.updateOne);
    routeMap.deleteOne && idRouter.delete(routeMap.deleteOne);

    return router;

};

const defaultOpts = {
    defaultPageSize: 20
};

/**
 * @param {Object} Model - mongoose model
 * @param {RouteMapOptions} opts - crud router options
 * @return {RouteMap}
 */
export const createRouteMap = (Model, opts = defaultOpts) => {

    const routeMap = {
        getAll: createGetAll(Model, opts),
        addOne: createAddOne(Model, opts),
        getOne: createGetOne(Model, opts),
        updateOne: createUpdateOne(Model, opts),
        deleteOne: createDeleteOne(Model, opts)
    };

    return routeMap;

};

export const createGetAll = (Model, opts = defaultOpts) => async (req, res, next) => {

    const delimeter = { delimeter: opts.delimeter || "," };
    const { projection, populate, condition } = getQueryValues(opts, opts.getAll, req, res);

    let { page, size, filter, sort } = req.query;
    page = page || 0;
    size = size || opts.defaultPageSize;
    filter = filter && qs(filter, delimeter);
    sort = sort && qs(sort, delimeter);

    if (filter) condition.push(filter);

    const query = Model.find()
        .where({ $and: condition })
        .skip(page * size)
        .limit(size);

    if (projection) query.select(projection);
    if (populate) query.populate(populate);
    if (sort) query.sort(sort);

    const result = await query.exec().catch(next);
    if (!result) return;

    const countQuery = Model.count().where({ $and: condition });
    const totalCount = await countQuery.exec().catch(next);

    if (totalCount === undefined) return;
    
    const link = new LinkHeader();
    link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: 0, size })}`, rel: "first" }); 
    link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: Math.max(page - 1, 0), size })}`, rel: "previous" });
    link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: Math.min(page + 1, totalCount), size })}`, rel: "next" });
    link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: Math.floor(totalCount / size), size })}`, rel: "last" });

    result && res.set("X-Total-Count", totalCount) && res.set("Link", link.toString()).json(result);

};

const getQueryValues = (opts, specificOpts, req, res) => {

    opts = { ...opts, ...specificOpts };
    const { securityCallback, projectionCallback, populateCallback } = opts;
    const security = securityCallback && securityCallback(req, res);
    const projection = projectionCallback && projectionCallback(req, res);
    const populate = populateCallback && populateCallback(req, res);

    const condition = [];
    if (security) condition.push(security);

    return { security, projection, populate, condition };

};

export const createAddOne = (Model, opts = defaultOpts) => async (req, res, next) => {

    const { projection } = getQueryValues(opts, opts.addOne, req, res);

    const query = new Model(req.body).save();
    const instance = await query.exec(next).catch(next);

    if (!instance) return;

    const createdQuery = Model.findById(instance._id);
    if (projection) createdQuery.select(projection);

    const createdInstance = await createdQuery.exec().catch(next);
    if (!createdInstance) return;

    instance && res.status(201).location(getLocation(req, createdInstance._id)).json(createdInstance);

};

export const getLocation = (req, id) => `${getCurrentUrl(req)}/${id}`;
export const getCurrentUrl = req => `${req.protocol}://${req.get('host')}${req.originalUrl}`;

export const createGetOne = (Model, opts = defaultOpts) => async (req, res, next) => {
    
    const { projection, populate, condition } = getQueryValues(opts, opts.getOne, req, res);

    condition.push({ _id: req.params.id });

    const query = Model.findOne({ $and: condition });
    if (projection) query.select(projection);
    if (populate) query.populate(populate);
    const instance = await query.exec().catch(next);

    instance ? res.json(instance) : next();

};

export const createUpdateOne = (Model, opts = defaultOpts) => async (req, res, next) => {

    const { projection, populate, condition } = getQueryValues(opts, opts.updateOne, req, res);

    condition.push({ _id: req.params.id });

    // Removing prohibited keys
    if (projection) {
        const inclusiveProjection = Object.keys(projection)[0] === 0 ? true : false;
        Object.keys(res.body)
            .filter(key => 
                inclusiveProjection && !projection[key] ?
                true : !inclusiveProjection && projection[key] ?
                true : false)
            .forEach(key => delete res.body[key]);        
    }

    const query = Model.findOneAndUpdate({ $and: condition }, req.body, { runValidators: true, context: 'query' });

    const instance = await query.exec().catch(next);
    if (!instance) return;

    const updatedQuery = Model.findById(instance._id);
    if (projection) updatedQuery.select(projection);
    if (populate) updatedQuery.populate(populate);

    const updatedInstance = await updatedQuery.exec().catch(next);
    if (!updatedInstance) return;

    updatedInstance ? res.status(200).json(updatedInstance) : next();

};

export const createDeleteOne = (Model, opts = defaultOpts) => async (req, res, next) => {

    const { condition } = getQueryValues(opts, opts.deleteOne, req, res);

    condition.push({ _id: req.params.id });

    const query = Model.findOneAndDelete({ $and: condition });
    const result = await query.exec().catch(next);

};

export default crudRouter;