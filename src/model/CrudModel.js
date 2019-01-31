import { filterObject } from "shared-tools";

const defaultPermissions = { create: { }, read: { }, update: { }, delete: { } };

class CrudModel {

  constructor({ excerptProjection, searchFields }) {
    this.excerptProjection = excerptProjection;
    this.searchFields = searchFields;
  }

  async getAll({ page = 0, size = 20, filter, sort }, permissions) {
    permissions = { ...defaultPermissions, ...permissions };
    const { read: { filter: permissionFilter, projection: permissionProjection } } = permissions;
    const projection = this.getReadProjection(permissionProjection);
    const resultFilter = this.getResultFilter(filter, permissionFilter);
    return await this.execGetAll({
      page,
      size,
      projection,
      filter: resultFilter,
      sort
    });
  }

  getResultFilter(queryFilter, permissionFilter) {

    if (queryFilter && queryFilter.search && this.searchFields) {
      const search = Array.isArray(this.searchFields) ? this.searchFields : [this.searchFields];
      Object.assign(queryFilter, { $or: [...this.searchFieldsToFilter(search, queryFilter.search)] });
      delete queryFilter.search;
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
      filter = this.convertFitlerId(filter);
      permissions = { ...defaultPermissions, ...permissions };
      const { read: { filter: permissionFilter, projection: permissionProjection } } = permissions;
      const projection = this.getReadProjection(permissionProjection);
      const resultFilter = this.getResultFilter(filter, permissionFilter);
      return await this.execGetOne({ filter: resultFilter, projection });
  }

  convertFitlerId(filter) {
      let result;
      if (filter && filter.id) {
          result = { ...filter };
          result._id = result.id;
          delete result.id;
      }
      return result;
  }

  async updateOne(filter, payload, permissions) {
      filter = this.convertFitlerId(filter);
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
      filter = this.convertFitlerId(filter);
      permissions = { ...defaultPermissions, ...permissions };
      const { read: { filter: permissionFilter } } = permissions;
      const resultFilter = this.getResultFilter(filter, permissionFilter);
      return await this.execDeleteOne(resultFilter);
  }

}

export default CrudModel;