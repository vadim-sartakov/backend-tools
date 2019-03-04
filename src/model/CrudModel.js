import { filterObject, createProjection } from "common-tools";

const defaultPermissions = { create: {}, read: {}, update: {}, delete: {} };

class CrudModel {

  constructor({ excerptProjection, searchFields, cascadeFields, loadDepth = 1 }) {
    this.excerptProjection = excerptProjection;
    this.searchFields = searchFields;
    this.cascadeFields = cascadeFields;
    this.loadDepth = loadDepth;
  }

  async getAll({ page = 0, size = 20, filter, sort, search }, permissions) {
    permissions = { ...defaultPermissions, ...permissions };
    const { read: { filter: permissionFilter, projection: permissionProjection } } = permissions;
    let projection = this.getReadProjection(permissionProjection);
    const resultFilter = this.getResultFilter(filter, permissionFilter, search);
    return await this.execGetAll({
      page,
      size,
      projection: projection,
      filter: resultFilter,
      sort
    });
  }

  getResultFilter(queryFilter = {}, permissionFilter, search) {

    if (search && this.searchFields) {
      const searchFieldsArray = Array.isArray(this.searchFields) ? this.searchFields : [this.searchFields];
      const searchFilter = this.searchFieldsToFilter(searchFieldsArray, search);
      queryFilter = Object.assign(queryFilter, { $or: searchFilter });
    }

    const filterArray = [];
    if (permissionFilter) filterArray.push(permissionFilter);
    if (queryFilter) filterArray.push(queryFilter);
    let resultFilter;
    switch (filterArray.length) {
      case 1:
        resultFilter = filterArray[0];
        break;
      case 2:
        resultFilter = { $and: filterArray };
        break;
      default:
    }
    return resultFilter;
  }

  getReadProjection(permissionProjection) {
    return this.excerptProjection || permissionProjection;
  }

  async count(filter, permissions) {
    permissions = { ...defaultPermissions, ...permissions };
    const { read: { filter: permissionFilter } } = permissions;
    const resultFilter = this.getResultFilter(filter, permissionFilter);
    return await this.execCount(resultFilter);
  }

  async addOne(payload, permissions) {
    permissions = { ...defaultPermissions, ...permissions };
    const { update: { projection } } = permissions;
    if (projection) payload = filterObject(payload, projection);
    return this.execAddOne(payload);
  }

  async getOne(filter, permissions) {
    if (this.underscoredId) filter = this.addIdUnderscore(filter);
    permissions = { ...defaultPermissions, ...permissions };
    const { read: { filter: permissionFilter, projection: permissionProjection } } = permissions;
    let projection = this.getReadProjection(permissionProjection);
    const resultFilter = this.getResultFilter(filter, permissionFilter);
    return await this.execGetOne({
      filter: resultFilter,
      projection: createProjection(projection)
    });
  }

  addIdUnderscore(filter) {
    let result;
    if (filter && filter.id) {
      result = { ...filter };
      result._id = result.id;
      delete result.id;
    }
    return result;
  }

  async updateOne(filter, payload, permissions) {
    if (this.underscoredId) filter = this.addIdUnderscore(filter);
    permissions = { ...defaultPermissions, ...permissions };
    const { read: { filter: permissionFilter }, update: { projection } } = permissions;
    if (projection) {
      const initialObject = await this.execGetOne(filter);
      payload = filterObject(payload, projection, initialObject);
    }
    const resultFilter = this.getResultFilter(filter, permissionFilter);
    return await this.execUpdateOne(resultFilter, payload);
  }

  async deleteOne(filter, permissions) {
    if (this.underscoredId) filter = this.addIdUnderscore(filter);
    permissions = { ...defaultPermissions, ...permissions };
    const { read: { filter: permissionFilter } } = permissions;
    const resultFilter = this.getResultFilter(filter, permissionFilter);
    return await this.execDeleteOne(resultFilter);
  }

}

export default CrudModel;