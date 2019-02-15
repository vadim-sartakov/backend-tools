import CrudModel from './CrudModel';

class SequelizeCrudModel extends CrudModel {

  constructor(Model, opts = {}) {
    super(opts);
    const { include } = opts;
    this.Model = Model;
    this.include = include;
  }

  searchFieldsToFilter(search, query) {
    return search.map(searchField => {
      const paths = searchField.split('.');
      const field = paths.length === 1 ? searchField : `$${searchField}$`;
      return { [field]: { $iLike: `%${query}%` } };
    });
  }

  async execGetAll({ page = 0, size = 20, projection, filter, sort }) {
    const params = { limit: size, offset: size * page };
    if (projection) params.attributes = this.convertProjectionToAttributes(projection);
    if (filter) params.where = filter;
    if (sort) params.order = this.convertSort(sort);
    if (this.include) params.include = this.include;
    return await this.Model.findAll(params);
  }

  convertProjectionToAttributes({ exclusive, paths }) {
    return exclusive ? { exclude: paths } : paths;
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
    return await this.Model.create(payload);
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