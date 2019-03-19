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

function reduceSchemaRecursive(schema, reducer, initialValue, context = {}) {
  const { paths = [], maxDepth, projection, parentArrays = [] } = context;
  return Object.keys(schema.paths).reduce((accumulator, path) => {
    const currentSchemaPath = schema.paths[path];
    const options = ( currentSchemaPath.caster && currentSchemaPath.caster.options ) || currentSchemaPath.options;
    const currentPaths = [...paths, path];
    const currentPathsString = currentPaths.join('.');
    const nextDepth = maxDepth === true ? maxDepth : maxDepth - 1;
    const nextParentArrays = currentSchemaPath.instance === 'Array' ? [...parentArrays, path] : parentArrays;
    const includePath = shouldIncludePath(currentPathsString, projection);

    let currentAccValue = ( includePath && reducer(accumulator, currentPathsString, currentSchemaPath, options, parentArrays) ) || accumulator;
    if (options.ref && ( nextDepth === true || nextDepth >= 0 ) && includePath) {
      const targetModel = this.db.model(options.ref);
      currentAccValue = reduceSchemaRecursive.call(
        this,
        targetModel.schema,
        reducer,
        currentAccValue,
        { paths: currentPaths, maxDepth: nextDepth, projection, parentArrays: nextParentArrays }
      );
    } else if (currentSchemaPath.schema) {
      currentAccValue = reduceSchemaRecursive.call(
        this,
        currentSchemaPath.schema,
        reducer,
        currentAccValue,
        { paths: currentPaths, maxDepth: nextDepth, projection, parentArrays: nextParentArrays }
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

function getJoinPipeline(pathsTree) {
  console.log(pathsTree);
  const arraysToUnwind = pathsTree.reduce((accumulator, path) => {
    if (path.type === 'ref' && path.parentArrays.length) {
      return new Set([...accumulator, ...path.parentArrays]);
    } else {
      return accumulator;
    }
  }, []);
  console.log(...arraysToUnwind);
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

  const pathsTree = reduceSchemaRecursive.call(this, this.schema, (accumulator, property, schema, options, parentArrays) => {
    let type;
    if (options.ref) type = 'ref';
    else if (schema.instance === 'Array') type = 'array';
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