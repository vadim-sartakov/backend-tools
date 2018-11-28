import { Router } from "express";
import querystring from "querystring";
import LinkHeader from "http-link-header";
import { getCurrentUrl, asyncMiddleware } from "../utils/http";

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

const errorHandler = (err, res, next) => {
    if (err.name !== "ValidationError") return next(err);
    res.status(400).json(err);
};

export const createGetAll = (Model, opts = defaultOpts) => asyncMiddleware(async (req, res) => {

    opts = { ...defaultOpts, ...opts };

    const { defaultPageSize } = opts;
    const { user, i18n } = res.locals;

    let { page, size, filter, sort } = req.query;
    page = (page && page * 1) || 0;
    size = (size && size * 1) || defaultPageSize;

    const query = Model.find()
        .setOptions({ i18n, user })
        .skip(page * size)
        .limit(size);

    if (filter) query.where(filter);
    if (sort) query.sort(sort);

    let result = await query.exec();

    const countQuery = Model.count().setOptions({ i18n, user });
    if (filter) countQuery.where(filter);

    let totalCount = await countQuery.exec();
    
    const lastPage = Math.max(Math.ceil(totalCount / size) - 1, 0);
    const prev = Math.max(page - 1, 0);
    const nextPage = Math.min(page + 1, totalCount, lastPage);

    const link = new LinkHeader();
    link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: 0, size })}`, rel: "first" }); 
    page > 0 && link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: prev, size })}`, rel: "previous" });
    page < lastPage && link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: nextPage, size })}`, rel: "next" });
    link.set({ uri: `${getCurrentUrl(req)}?${querystring.stringify({ page: lastPage, size })}`, rel: "last" });

    res.set("X-Total-Count", totalCount);
    res.set("Link", link.toString());
    res.json(result);

}, (err, req, res, next) => errorHandler(err, res, next));

export const createAddOne = Model => asyncMiddleware(async (req, res) => {

    const { user, i18n } = res.locals;
    const doc = new Model(req.body);
    
    doc.setOptions && doc.setOptions({ user, i18n });
    
    let instance = await doc.save();
    let created = await Model.findById(instance._id).setOptions({ user, i18n });

    res.status(201).location(getLocation(req, created._id)).json(created.toObject());

}, (err, req, res, next) => errorHandler(err, res, next));

export const getLocation = (req, id) => `${getCurrentUrl(req)}/${id}`;

export const createGetOne = Model => asyncMiddleware(async (req, res, next) => {
    const { user, i18n } = res.locals;
    let instance = await Model.findOne({ _id: req.params.id }).setOptions({ user, i18n });
    instance ? res.json(instance) : next();
}, (err, req, res, next) => errorHandler(err, res, next));

export const createUpdateOne = Model => asyncMiddleware(async (req, res, next) => {
    const { user, i18n } = res.locals;
    const instance = await Model.findOneAndUpdate({ _id: req.params.id }, req.body, { runValidators: true, context: 'query', i18n, user });
    if (!instance) return next();
    const updatedInstance = await Model.findById(instance._id).setOptions({ user, i18n });
    updatedInstance && res.json(updatedInstance);
}, (err, req, res, next) => errorHandler(err, res, next));

export const createDeleteOne = Model => asyncMiddleware(async (req, res, next) => {
    const { user, i18n } = res.locals;
    const instance = await Model.findOneAndDelete({ _id: req.params.id }).setOptions({ user, i18n });
    instance ? res.status(204).send() : next();
}, (err, req, res, next) => errorHandler(err, res, next));

export default crudRouter;