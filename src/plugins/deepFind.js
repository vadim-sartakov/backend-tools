const checkIsExclusive = projection => {
  const keys = Object.keys(projection);
  return projection[keys[0]] === 0;
};

const shouldIncludePath = (path, projection) => {
  if (!projection) return true;
  const keys = Object.keys(projection);
  const isExclusive = checkIsExclusive(projection);
  const pathInProjection = keys.some(key => isExclusive ? key === path : ( key.startsWith(path) || path.startsWith(key) ) );
  return ( isExclusive && !pathInProjection ) || ( !isExclusive && pathInProjection ) ? true : false;
};

function reduceSchemaRecursive(schemaObject, reducer, initialValue, context = {}) {
  const { paths = [], maxDepth, projection, parentArrays = [] } = context;
  return Object.keys(schemaObject).reduce((accumulator, property) => {
    const value = schemaObject[property];
    const isArray = Array.isArray(value);
    const nestedSchema = isArray ? value[0].obj : value;
    const currentPaths = [...paths, property];
    const currentPathsString = currentPaths.join('.');
    const nextDepth = maxDepth === true ? maxDepth : maxDepth - 1;
    const nextParentArrays = isArray ? [...parentArrays, property] : parentArrays;
    const includePath = shouldIncludePath(currentPathsString, projection);

    let currentAccValue = ( includePath && reducer(accumulator, currentPathsString, value, parentArrays) ) || accumulator;
    if (nestedSchema.ref && ( nextDepth === true || nextDepth >= 0 ) && includePath) {
      const targetModel = this.db.model(nestedSchema.ref);
      currentAccValue = reduceSchemaRecursive.call(
        this,
        targetModel.schema.obj,
        reducer,
        currentAccValue,
        { paths: currentPaths, maxDepth: nextDepth, projection, parentArrays: nextParentArrays }
      );
    } else if (typeof(nestedSchema) === 'object' && !nestedSchema.ref && includePath) {
      currentAccValue = reduceSchemaRecursive.call(
        this,
        nestedSchema,
        reducer,
        currentAccValue,
        { paths: currentPaths, maxDepth, projection, parentArrays: nextParentArrays }
      );
    }
    return currentAccValue;
  }, initialValue);
}

function searchQueryToFilter(searchQuery) {
  const { searchFields } = this.schema.options;
  if (!searchQuery || !searchFields) return;
  const filters = searchFields.map(searchField => {
    return { [searchField]: new RegExp(`.*${searchQuery}.*`, 'i') };
  });
  return { $or: filters};
}

function getCollectionFilter(projection, filter) {
  if (!projection) return;
}

function getJoinPipeline(pathsTree, projection, maxDepth) {
  //const arraysToUnwind = pathsTree.filter();
  //const set = new Set();
}

const getResultFilter = (filter, searchFilter) => {
  if (!filter && !searchFilter) return;
  const resultFilter = [];
  filter && resultFilter.push(filter);
  searchFilter && resultFilter.push(searchFilter);
  return resultFilter.length === 1 ? resultFilter[0] : { $and: resultFilter };
};

export function deepFindAll(options = {}) {

  const { skip, limit, projection, filter, sort, search } = options;
  let maxDepth;
  if (options.maxDepth || options.maxDepth === 0) maxDepth = options.maxDepth;
  else if (this.schema.options.maxDepth || this.schema.options.maxDepth === 0) maxDepth = this.schema.options.maxDepth;
  else maxDepth = 1;

  const pathsTree = reduceSchemaRecursive.call(this, this.schema.obj, (accumulator, property, schema, parentArrays) => {
    let type;
    if (schema.ref) type = 'ref';
    else if (Array.isArray(schema)) type = 'array';
    else type = 'path';
    return [...accumulator, { property, type, parentArrays }];
  }, [], { maxDepth, projection });

  const pipeline = [];

  const searchFilter = searchQueryToFilter.call(this, search);
  const resultFilter = getResultFilter(filter, searchFilter);

  const rootCollectionFilter = getCollectionFilter.call(this, projection);

  rootCollectionFilter && pipeline.push({ $match: rootCollectionFilter });

  const joinPipeline = getJoinPipeline.call(this, pathsTree, projection, maxDepth);
  joinPipeline && pipeline.push(...joinPipeline);

  resultFilter && pipeline.push({ $match: resultFilter });
  projection && pipeline.push({ $project: projection });
  sort && pipeline.push({ $sort: sort });
  skip && pipeline.push({ $skip: skip });
  limit && pipeline.push({ $limit: limit });

  return pipeline.length === 0 ? this.find() : this.aggregate(pipeline);

}

const deepFindPlugin = schema => {
  schema.static('deepFindAll', deepFindAll);
  schema.static('deepFindOne', async function(options) {
    const result = await deepFindAll({ ...options, limit: 1 });
    return result.length > 0 ? result[0] : null;
  });
};

export default deepFindPlugin;