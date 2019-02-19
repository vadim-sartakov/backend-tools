import { createProjection } from 'common-tools';
import CrudModel from './CrudModel';

class SequelizeCrudModel extends CrudModel {

  constructor(Model, opts = {}) {
    super(opts);
    this.Model = Model;
    this.readInclude = this.loadFields && this.loadFieldsToInclude(this.loadFields);
  }

  searchFieldsToFilter(search, query) {
    return search.map(searchField => {
      const paths = searchField.split('.');
      const field = paths.length === 1 ? searchField : `$${searchField}$`;
      return { [field]: { $iLike: `%${query}%` } };
    });
  }

  loadFieldsToInclude(loadFields) {
    return Object.keys(loadFields).map(field => {
      const value = loadFields[field];
      const include = value.loadFields && this.loadFieldsToInclude(value.loadFields);
      const attributes = this.convertProjectionToAttributes(
          createProjection( value.projection || value )
      );
      const result = {
        association: field,
        attributes,
        // Without this option, malformed query produced when using limit and offset
        // It throws SequelizeDatabaseError: missing FROM-clause entry for table
        duplicating: false
      };
      if (include) result.include = include;
      return result;
    });
  }

  convertProjectionToAttributes({ exclusive, paths }) {
    return exclusive ? { exclude: paths } : paths;
  }

  async execGetAll({ page = 0, size = 20, projection, filter, sort }) {
    const params = { limit: size, offset: size * page };
    if (projection) params.attributes = this.convertProjectionToAttributes(projection);
    if (filter) params.where = filter;
    if (sort) params.order = this.convertSort(sort);
    if (this.readInclude) params.include = this.readInclude;
    return await this.Model.findAll(params);
  }

  convertSort(sort) {
    if (!sort || typeof (sort) !== 'object') return;
    const keys = Object.keys(sort);
    if (keys.length === 0) return;
    return keys.map(key => [key, sort[key] === 1 ? 'ASC' : 'DESC']);
  }

  async execCount(filter) {
    return await this.Model.count({ where: filter });
  }

  async execAddOne(payload) {
    return await this.Model.sequelize.transaction(async transaction => {
      const options = { transaction };
      if (this.cascadeFields) options.include = this.cascadeFieldsToInclude(this.cascadeFields);
      const instance = await this.Model.create(payload, options);
      await Object.keys(this.Model.associations).reduce(async (accumulator, association) => {
        if (this.cascadeFields && this.cascadeFields.some(cascadeField => association === ( cascadeField.field || cascadeField ) )) return;
        const setter = instance[`set${association.charAt(0).toUpperCase() + association.substring(1)}`];
        const value = payload[association];
        if (value) await setter.apply(instance, [value, { transaction }]);
      }, Promise.resolve());
      return instance;
    });
  }

  cascadeFieldsToInclude(cascadeFields) {
    return cascadeFields.map(cascadeFieldsItem => {
      if (typeof (cascadeFieldsItem) === 'string') return cascadeFieldsItem;
      const include = cascadeFieldsItem.cascadeFields && this.cascadeFieldsToInclude(cascadeFieldsItem.cascadeFields);
      const result = { association: cascadeFieldsItem.field };
      if (include) result.include = include;
      return result;
    });
  }

  async execGetOne({ filter, projection }) {
    return await this.Model.find({
      attributes: this.convertProjectionToAttributes(projection),
      where: filter,
    });
  }

  async execUpdateOne(filter, payload) {
    const [affected, result] = await this.Model.update(payload, { where: filter, returning: true });
    if (affected === 0) return null;
    return result[0];
  }

  async execDeleteOne(filter) {
    return await this.Model.destroy({ where: filter, returning: true });
  }

}

export default SequelizeCrudModel;