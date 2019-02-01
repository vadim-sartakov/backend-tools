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
          return { [`$${searchField}$`]: { $iLike: `%${query}%` } };
      });
  }

  async execGetAll({ page = 0, size = 20, projection, filter, sort }) {
      const params = { limit: size, offset: size * page };
      if (projection) params.attributes = this.convertProjection(projection);
      if (filter) params.where = filter;
      if (sort) params.order = this.convertSort(sort);
      if (this.include) params.include = this.include;
      return await this.Model.findAll(params);
  }

  convertProjection(projection) {
    if (!projection || typeof(projection) !== 'string' || projection.length === 0) return;
    const paths = projection.split(' ');
    if (paths.length === 0) return;
    const exclusive = paths[0].startsWith('-');
    return exclusive ? { exclude: paths.map(curPath => curPath.substring(1)) } : paths;
  }

  convertSort(sort) {
    if (!sort || typeof(sort) !== 'object') return;
    const keys = Object.keys(sort);
    if (keys.length === 0) return;
    return keys.map(key => [key, sort[key] === 1 ? 'ASC' : 'DESC']);
  }

  async execCount(filter) {
      const countQuery = this.Model.count();
      if (filter) countQuery.where(filter);
      return await countQuery.exec();
  }

  async execAddOne(payload) {
      const doc = new this.Model(payload);
      let saved = await doc.save();
      return saved.toObject();
  }

  async execGetOne({ filter, projection }) {
      const query = this.Model.findOne(filter);
      if (projection) query.select(projection);
      this.applyPopulateIfRequired(query);
      query.setOptions({ lean: true });
      return await query.exec();
  }

  async execUpdateOne(filter, payload) {
      return await this.Model.findOneAndUpdate(filter, payload, { new: true, lean: true });
  }

  async execDeleteOne(filter) {
      return await this.Model.findOneAndDelete(filter).lean();
  }

}

export default SequelizeCrudModel;