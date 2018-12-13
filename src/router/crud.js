import { Router } from "express";
import querystring from "querystring";
import LinkHeader from "http-link-header";
import { getCurrentUrl, asyncMiddleware } from "../utils/http";
import { permissions, validator } from "../middleware";

const defaultOptions = {
    defaultPageSize: 20
};

const createMiddlewareChain = (createMiddleware, Model, options) => {
    const { securitySchema, validationSchema } = options;
    const crudMiddleware = createMiddleware(Model, options);
    const chain = [];
    if (securitySchema) chain.push(permissions(securitySchema));
    if (validationSchema) chain.push(validator(validationSchema));
    chain.push(crudMiddleware);
    return chain;
};

const crudRouter = (Model, options) => {
    options = { ...defaultOptions, ...options };
    const router = Router();
    const rootRouter = router.route("/");
    !options.disableGetAll && rootRouter.get(createMiddlewareChain(createGetAll, Model, options));
    !options.disableAddOne && rootRouter.post(createMiddlewareChain(createAddOne, Model, options));
    const idRouter = router.route("/:id");
    !options.disableGetOne && idRouter.get(createMiddlewareChain(createGetOne, Model, options));
    !options.disableUpdateOne && idRouter.put(createMiddlewareChain(createUpdateOne, Model, options));
    !options.disableDeleteOne && idRouter.delete(createMiddlewareChain(createDeleteOne, Model, options));
    return router;
};

const createGetAll = (Model, options) => asyncMiddleware(async (req, res) => {

    const { defaultPageSize } = options;
    const { permissions } = res.locals;

    let { page, size, filter, sort } = req.query;
    // Converting to number by multiplying by 1
    page = (page && page * 1) || 0;
    size = (size && size * 1) || defaultPageSize;

    const result = await Model.getAll({ page, size, filter, sort }, permissions);
    let totalCount = await Model.count(filter, undefined);
    
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

});

const getLocation = (req, id) => `${getCurrentUrl(req)}/${id}`;

const createAddOne = Model => asyncMiddleware(async (req, res) => {
    const { permissions } = res.locals;
    let instance = await Model.addOne(req.body, permissions);
    res.status(201).location(getLocation(req, instance.id)).json(instance);
});

const createGetOne = Model => asyncMiddleware(async (req, res, next) => {
    const { permissions } = res.locals;
    let instance = await Model.getOne({ id: req.params.id }, permissions);
    instance ? res.json(instance) : next();
});

const createUpdateOne = Model => asyncMiddleware(async (req, res, next) => {
    const { permissions } = res.locals;
    const instance = await Model.updateOne({ id: req.params.id }, req.body, permissions);
    return instance ? res.json(instance) : next();
});

const createDeleteOne = Model => asyncMiddleware(async (req, res, next) => {
    const { permissions } = res.locals;
    const instance = await Model.deleteOne({ id: req.params.id }, permissions);
    return instance ? res.status(204).send() : next();
});

export default crudRouter;