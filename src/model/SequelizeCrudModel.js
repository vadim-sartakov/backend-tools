import CrudModel from './CrudModel';

class SequelizeCrudModel extends CrudModel {

  constructor(Model, opts = {}) {
    super(opts);
    this.Model = Model;
  }

  queryOptions(Model, options = {}) {

    const { projection, depthLevel = 1, paths = [] } = options;

    const attributeIsInProjection = attribute => {
      if (!projection) return true;
      const projectionPaths = projection.paths || projection;
      const currentPath = [...paths, attribute].join('.');
      return projectionPaths.some(projectionPath => {
        return projection.exclusive ? projectionPath === currentPath : projectionPath.startsWith(currentPath);
      });
    };
    const attributes = Object.keys(Model.attributes).reduce((accumulator, attribute) => {
      const result = [...accumulator];
      attributeIsInProjection(attribute) && result.push(attribute);
      return result;
    }, []);

    const include = Model.associations && Object.keys(Model.associations).reduce((accumulator, attribute) => {
      
      const isInProjection = attributeIsInProjection(attribute);
      if ( ( !projection || ( isInProjection && !projection.exclusive ) || ( !isInProjection && projection.exclusive ) ) && depthLevel > 0 ) {
        const associationModel = Model.associations[attribute].target;
        const nextOpts = {
          projection,
          depthLevel: depthLevel - 1,
          paths: [...paths, attribute]
        };
        return [...accumulator, this.queryOptions(associationModel, nextOpts)];
      } else {
        return accumulator;
      }

    }, []);

    const result = { duplicating: false };
    const association = paths.length > 0 && paths[paths.length - 1];
    if (association) result.association = association;

    if (projection && attributes.length > 0) result.attributes = projection.exclusive ? { exclude: attributes } : attributes;
    if (include && Object.keys(include).length > 0) result.include = include;

    return result;

  }

  searchFieldsToFilter(search, query) {
    return search.map(searchField => {
      const paths = searchField.split('.');
      const field = paths.length === 1 ? searchField : `$${searchField}$`;
      return { [field]: { $iLike: `%${query}%` } };
    });
  }

  async execGetAll({ page = 0, size = 20, projection, filter, sort }) {
    const options = this.queryOptions(this.Model, { projection, depthLevel: this.loadDepth });
    const params = { limit: size, offset: size * page, ...options };
    if (filter) params.where = filter;
    if (sort) params.order = this.convertSort(sort);
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
      await Object.keys(this.Model.associations).reduce(async (accumulator, associationKey) => {
        if (this.isCascadeField(associationKey)) return;
        const association = this.Model.associations[associationKey];   
        const setter = instance[association.accessors.set];
        const value = payload[associationKey];
        if (value) await setter.apply(instance, [value, { transaction }]);
      }, Promise.resolve());
      return instance;
    });
  }

  isCascadeField(field) {
    return (this.cascadeFields && this.cascadeFields.some(cascadeField => field === ( cascadeField.field || cascadeField ) ));
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
    const options = this.queryOptions(this.Model, { projection, depthLevel: this.loadDepth }) || {};
    if (filter) options.where = filter;
    return await this.Model.findOne(options);
  }

  async execUpdateOne(filter, payload) {
    return this.Model.sequelize.transaction(async transaction => {
      const options = { transaction, where: filter };
      if (this.cascadeFields) options.include = this.cascadeFieldsToInclude(this.cascadeFields);
      const instance = await this.Model.findOne(options);
      if (!instance) return null;
      await this.updateObject(instance, payload, transaction);
      return true;
    });
  }

  async updateObject(instance, payload, transaction) {
    const { attributes, associations } = instance.constructor;
    await Object.keys(associations).reduce(async (accumulator, associationKey) => {
      const associatedInstance = instance[associationKey];
      if (!associatedInstance) return;
      if (Array.isArray(associatedInstance)) {
        const association = associations[associationKey];
        if (association.associationType !== 'BelongsToMany') {
          throw Error('Cascade update allowed only for BelongsToMany array associations');
        }
        const setter = instance[association.accessors.set];
        const value = payload[associationKey];
        const targetModel = association.target;
        const newValues = value.map(curValue => targetModel.build(curValue));
        if (value) await setter.apply(instance, [value, { transaction }]);
      } else {
        await this.updateObject(associatedInstance, payload[associationKey], transaction);
      }
    }, Promise.resolve([]));
    Object.keys(attributes).filter(
      attribute => attribute !== 'id'
          && attribute !== 'updatedAt'
          && attribute !== 'createdAt'
    ).forEach(attribute => {
      const value = payload[attribute];
      value && instance.set(attribute, value);
    });
    await instance.save({ transaction });
  }

  async execDeleteOne(filter) {
    return this.Model.sequelize.transaction(async transaction => {
      return this.Model.destroy({ where: filter, transaction });
    });
  }

  deleteAssociation(Model, attribute) {

  }

}

export default SequelizeCrudModel;