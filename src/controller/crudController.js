import { Router } from "express";
import querystring from "querystring";
import LinkHeader from "http-link-header";

const crudRouter = (Model, opts) => {

    const router = Router();
    const routeMap = createRouteMap(Model, opts);

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

const createRouteMap = (Model, opts = defaultOpts) => {

    const routeMap = {
        getAll: createGetAll(Model, opts),
        addOne: createAddOne(Model, opts),
        getOne: createGetOne(Model, opts),
        updateOne: createUpdateOne(Model, opts),
        deleteOne: createDeleteOne(Model, opts)
    };

    return routeMap;

};

const normalizeConditions = conditions => {
    if (conditions.length === 1) {
        return conditions[0];
    } else if (conditions.length > 1) {
        return { $and: conditions };
    }
};

/**
 * @param {Object} Model 
 * @param {RouteMapOptions} opts 
 */
export const createGetAll = (Model, opts = defaultOpts) => async (req, res, next) => {

    opts = { ...defaultOpts, ...opts };

    const { projection, populate, conditions } = getQueryValues(opts, opts.getAll, req, res);
    const { defaultPageSize } = opts;

    let { page, size, filter, sort } = req.query;
    page = (page && page * 1) || 0;
    size = (size && size * 1) || defaultPageSize;

    if (filter) conditions.push(filter);

    const condition = normalizeConditions(conditions);

    const query = Model.find()
        .skip(page * size)
        .limit(size);

    condition && query.where(condition);
    if (projection) query.select(projection);
    if (populate) query.populate(populate);
    if (sort) query.sort(sort);

    const result = await query.exec().catch(next);
    if (!result) return;

    const countQuery = Model.count();
    condition && countQuery.where(condition);
    const totalCount = await countQuery.exec().catch(next);

    if (totalCount === undefined) return;
    
    const lastPage = Math.max(Math.ceil(totalCount / size) - 1, 0);
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

    const conditions = [];
    if (security) conditions.push(security);

    return { security, projection, populate, conditions };

};

export const createAddOne = (Model, opts = defaultOpts) => async (req, res, next) => {

    const { projection } = getQueryValues(opts, opts.addOne, req, res);

    const document = new Model(req.body);
    document.translateMessages(res.locals.i18n);

    const instance = await document.save().catch(next);
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
    
    const { projection, populate, conditions } = getQueryValues(opts, opts.getOne, req, res);

    conditions.push({ _id: req.params.id });
    const condition = normalizeConditions(conditions);

    const query = Model.findOne(condition);
    if (projection) query.select(projection);
    if (populate) query.populate(populate);
    const instance = await query.exec().catch(next);

    instance ? res.json(instance) : next();

};

export const createUpdateOne = (Model, opts = defaultOpts) => async (req, res, next) => {

    const { projection, populate, conditions } = getQueryValues(opts, opts.updateOne, req, res);

    conditions.push({ _id: req.params.id });
    const condition = normalizeConditions(conditions);

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

    const query = Model.findOneAndUpdate(condition, req.body, { runValidators: true, context: 'query', i18n: res.locals.i18n });

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
    const { conditions } = getQueryValues(opts, opts.deleteOne, req, res);
    conditions.push({ _id: req.params.id });
    const condition = normalizeConditions(conditions);
    const query = Model.findOneAndDelete(condition);
    query.where(condition);
    const instance = await query.exec().catch(next);
    instance && res.status(204).send();
};

export default crudRouter;