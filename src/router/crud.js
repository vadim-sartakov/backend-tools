import { Router } from "express";
import querystring from "querystring";
import _ from "lodash";
import LinkHeader from "http-link-header";
import { filterObject } from "common-tools";
import { getCurrentUrl, asyncMiddleware } from "../utils";
import { security, validator } from "../middleware";

const defaultOptions = {
  idProperty: '_id',
  returnValue: false,
  getAll: {
    defaultPageSize: 20
  },
  addOne: {},
  getOne: {},
  updateOne: {},
  deleteOne: {}
};

const defaultPermissions = {
  create: {},
  read: {},
  update: {},
  delete: {}
};

class CrudRouter {
  
  constructor(crudModel, options) {
    this.crudModel = crudModel;
    this.options = _.merge({ ...defaultOptions }, options);
    this.router = new Router();

    this.rootRouter = this.router.route("/");
    !this.options.getAll.disable && this.rootRouter.get(this.createChain(getAll, "read"));
    !this.options.addOne.disable && this.rootRouter.post(this.createChain(addOne, "read", "create"));

    this.idRouter = this.router.route("/:id");
    !this.options.getOne.disable && this.idRouter.get(this.createChain(getOne, "read"));
    !this.options.updateOne.disable && this.idRouter.put(this.createChain(updateOne, "read", "update"));
    !this.options.deleteOne.disable && this.idRouter.delete(this.createChain(deleteOne, "read", "delete"));
  }

  createChain (middleware, ...securityModifiers) {
    const chain = [];
    this.options.securitySchema && chain.push(security(this.options.securitySchema, ...securityModifiers));
    this.options.validationSchema && chain.push(validator(this.options.validationSchema));
    chain.push(middleware(this.crudModel, this.options));
    return chain;
  }

}

const mergeFilters = (...filters) => {
  const resultFilters = filters.filter(item => Boolean(item));
  if (!resultFilters.length) return;
  return resultFilters.length === 1 ? resultFilters[0] : { $and: resultFilters };
};

const getAll = (Model, options) => asyncMiddleware(async (req, res) => {

  const { defaultPageSize, defaultProjection } = options.getAll;
  const permissions = _.merge(defaultPermissions, res.locals.permissions);

  let { page, size, filter: queryFilter, sort, search } = req.query;

  // 'supertest' passes objects here, but real http request will have strings
  if (filter && typeof (filter) === "string") queryFilter = JSON.parse(queryFilter);
  if (sort && typeof (sort) === "string") sort = JSON.parse(sort);
  
  // Converting to number by multiplying by 1
  page = (page && page * 1) || 0;
  size = (size && size * 1) || defaultPageSize;

  const queryOptions = { page, size };
  
  const filter = mergeFilters(queryFilter, permissions.read.filter);
  const projection = defaultProjection || permissions.read.projection;

  if (filter) queryOptions.filter = filter;
  if (projection) queryOptions.projection = projection;
  if (sort) queryOptions.sort = sort;
  if (search) queryOptions.search = search;

  const result = await Model.getAll(queryOptions);
  let totalCount = await Model.count(filter);

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

const addOne = (Model, options) => asyncMiddleware(async (req, res) => {

  const { returnValue } = options;
  const permissions = _.merge(defaultPermissions, res.locals.permissions);

  let payload = _.cloneDeep(req.body);
  if (permissions.create.projection) payload = filterObject(permissions.create.projection);

  let instance = await Model.addOne(payload);
  const id = instance[options.idProperty];
  res.status(201);
  res.location(getLocation(req, id));

  if (returnValue) {
    instance = await secureGetOne(Model, options, id, permissions);
    res.json(instance);
  } else {
    res.end();
  }

});

const getOne = (Model, options) => asyncMiddleware(async (req, res, next) => {
  const permissions = _.merge(defaultPermissions, res.locals.permissions);
  let instance = await secureGetOne(Model, options, req.params.id, permissions);
  instance ? res.json(instance) : next();
});

const secureGetOne = async (Model, options, id, permissions) => {
  const { defaultProjection } = options.getOne;
  const projection = defaultProjection || permissions.read.projection;
  return Model.getOne(id, projection);
};

const updateOne = (Model, options) => asyncMiddleware(async (req, res, next) => {

  const { returnValue } = options;
  const permissions = _.merge(defaultPermissions, res.locals.permissions);
  let payload = _.cloneDeep(req.body);

  if (permissions.update.projection) payload = filterObject(permissions.update.projection);
  const filter = mergeFilters({ [options.idProperty]: req.params.id }, permissions.read.filter);

  const result = await Model.updateOne(filter, payload);
  if (!result) return next();

  if (returnValue) {
    const instance = await secureGetOne(Model, options, req.params.id, permissions);
    res.json(instance);
  } else {
    res.end();
  }

});

const deleteOne = (Model, options) => asyncMiddleware(async (req, res, next) => {

  const { returnValue } = options;
  const permissions = _.merge(defaultPermissions, res.locals.permissions);
  let valueToDelete;
  if (returnValue) valueToDelete = await secureGetOne(Model, options, req.params.id, permissions);

  const filter = mergeFilters({ [options.idProperty]: req.params.id }, permissions.read.filter);

  const result = await Model.deleteOne(filter);
  if (!result) return next();

  if (returnValue) {
    res.json(valueToDelete);
  } else {
    res.status(204);
    res.end();
  }

});

export default CrudRouter;