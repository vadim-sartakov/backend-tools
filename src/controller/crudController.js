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
    defaultPageSize: 20,
    delimiter: ","
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

/**
 * @param {Object} Model 
 * @param {RouteMapOptions} opts 
 */
export const createGetAll = (Model, opts = defaultOpts) => async (req, res, next) => {

    opts = { ...defaultOpts, ...opts };

    const { projection, populate, conditions } = getQueryValues(opts, opts.getAll, req, res);
    const { delimiter, defaultPageSize } = opts;

    let { page, size, filter, sort } = req.query;
    page = (page && page * 1) || 0;
    size = (size && size * 1) || defaultPageSize;
    filter = filter && qs.parse(filter, { delimiter });
    sort = sort && qs.parse(sort, { delimiter });

    if (filter) conditions.push(filter);

    const condition = 
            (conditions.length === 1 && conditions[0]) ||
            (conditions.length > 1 && { $and: conditions });

    const query = Model.find()
        .skip(page * size)
        .limit(size);

    condition && query.where({ $and: conditions });
    if (projection) query.select(projection);
    if (populate) query.populate(populate);
    if (sort) query.sort(sort);

    const result = await query.exec().catch(next);
    if (!result) return;

    const countQuery = Model.count();
    condition && countQuery.where({ $and: condition });
    const totalCount = await countQuery.exec().catch(next);

    if (totalCount === undefined) return;
    
    const lastPage = Math.ceil(totalCount / size) - 1;
    const prev = Math.max(page - 1, 0);
    const nextPage = Math.min(page + 1, totalCount, lastPage);

    const link = new LinkHeader();
    link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: 0, size })}`, rel: "first" }); 
    page > 0 && link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: prev, size })}`, rel: "previous" });
    page < lastPage && link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: nextPage, size })}`, rel: "next" });
    link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: lastPage, size })}`, rel: "last" });

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
    const instance = await new Model(req.body).save().catch(next);
    if (!instance) return;

    const createdQuery = Model.findById(instance._id);
    if (projection) createdQuery.select(projection);

    const createdInstance = await createdQuery.exec().catch(next);
    if (!createdInstance) return;

    createdInstance && res.status(201).location(getLocation(req, createdInstance.id)).json(createdInstance);

};

export const getLocation = (req, id) => `${getCurrentUrl(req)}/${id}`;
export const getCurrentUrl = req => `${req.protocol}://${req.get('host')}${req.baseUrl}`;

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
    condition && query.where({ $and: condition });
    const instance = await query.exec().catch(next);
    instance && res.status(204).send();
};

export default crudRouter;