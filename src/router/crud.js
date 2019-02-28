import { Router } from "express";
import querystring from "querystring";
import _ from "lodash";
import LinkHeader from "http-link-header";
import { getCurrentUrl, asyncMiddleware } from "../utils";
import { security, validator } from "../middleware";

const defaultOptions = {
  getAll: {
    defaultPageSize: 20
  },
  addOne: {},
  getOne: {},
  updateOne: {},
  deleteOne: {}
};

class CrudRouter extends Router {
  
  constructor(crudModel, options) {
    super();
    options = _.merge(options, defaultOptions);
    const { securitySchema, validationSchema } = options;
    securitySchema && this.use( security(securitySchema) );  
    validationSchema && this.use( validator(validationSchema) );

    this.rootRouter = this.route("/");
    !options.getAll.disable && this.rootRouter.get( createGetAll(crudModel, options) );
    !options.addOne.disable && this.rootRouter.post( createAddOne(crudModel, options) );
    this.idRouter = this.route("/:id");
    !options.getOne.disable && this.idRouter.get( createGetOne(crudModel, options) );
    !options.updateOne.disable && this.idRouter.put( createUpdateOne(crudModel, options) );
    !options.deleteOne.disable && this.idRouter.delete( createDeleteOne(crudModel, options) );
  }

}

const createGetAll = (Model, options) => asyncMiddleware(async (req, res) => {

  const { defaultPageSize } = options.getAll;
  const { permissions } = res.locals;

  let { page, size, filter, sort, search } = req.query;

  // 'supertest' passes objects here, but real http request will have strings
  if (typeof (filter) === "string") filter = JSON.parse(filter);
  if (typeof (sort) === "string") sort = JSON.parse(sort);
  
  // Converting to number by multiplying by 1
  page = (page && page * 1) || 0;
  size = (size && size * 1) || defaultPageSize;

  const result = await Model.getAll({ page, size, filter, sort, search }, permissions);
  let totalCount = await Model.count(filter, undefined);

  const lastPage = Math.max(Math.ceil(totalCount / size) - 1, 0);
  const prev = Math.max(page - 1, 0);
  const nextPage = Math.min(page + 1, totalCount, lastPage);

  const link = new LinkHeader();
  const currentUrl = getCurrentUrl(req);
  link.set({ uri: `${currentUrl}?${querystring.stringify({ page: 0, size })}`, rel: "first" });
  page > 0 && link.set({ uri: `${currentUrl}?${querystring.stringify({ page: prev, size })}`, rel: "previous" });
  page < lastPage && link.set({ uri: `${currentUrl}?${querystring.stringify({ page: nextPage, size })}`, rel: "next" });
  link.set({ uri: `${currentUrl}?${querystring.stringify({ page: lastPage, size })}`, rel: "last" });

  res.set("X-Total-Count", totalCount);
  res.set("Link", link.toString());
  res.json(result);

});

const getLocation = (req, id) => `${getCurrentUrl(req)}/${id}`;

const createAddOne = Model => asyncMiddleware(async (req, res) => {
  const { permissions } = res.locals;
  let instance = await Model.addOne(req.body, permissions);
  const id = instance._id || instance.id;
  instance = await Model.getOne({ id }, permissions);
  res.status(201).location(getLocation(req, instance._id || instance.id)).json(instance);
});

const createGetOne = Model => asyncMiddleware(async (req, res, next) => {
  const { permissions } = res.locals;
  let instance = await Model.getOne({ id: req.params.id }, permissions);
  instance ? res.json(instance) : next();
});

const returnInstanceOrContinue = async (Model, instance, req, res, next) => {
  if (instance) {
    instance = await Model.getOne({ id: req.params.id }, res.locals.permissions);
    res.json(instance);
  } else {
    next();
  }
};

const createUpdateOne = Model => asyncMiddleware(async (req, res, next) => {
  const { permissions } = res.locals;
  let instance = await Model.updateOne({ id: req.params.id }, req.body, permissions);
  await returnInstanceOrContinue(Model, instance, req, res, next);
});

const createDeleteOne = Model => asyncMiddleware(async (req, res, next) => {
  const { permissions } = res.locals;
  const instance = await Model.deleteOne({ id: req.params.id }, permissions);
  return instance ? res.status(204).end() : next();
});

export default CrudRouter;