function reduceSchemaRecursive(schemaObject, reducer, initialValue, context = {}) {
  const { paths = [], maxDepth, parentArrays = [] } = context;
  return Object.keys(schemaObject).reduce((accumulator, property) => {
    const value = schemaObject[property];
    const isArray = Array.isArray(value);
    const nestedSchema = isArray ? value[0].obj : value;
    const currentPaths = [...paths, property];
    const nextDepth = maxDepth - 1;
    const nextParentArrays = isArray ? [...parentArrays, property] : parentArrays;
    
    let currentAccValue = reducer(accumulator, currentPaths.join('.'), value, parentArrays);
    if (nestedSchema.ref && nextDepth >= 0) {
      const targetModel = this.db.model(nestedSchema.ref);
      currentAccValue = reduceSchemaRecursive.call(
        this,
        targetModel.schema.obj,
        reducer,
        currentAccValue,
        { paths: currentPaths, maxDepth: nextDepth, parentArrays: nextParentArrays }
      );
    } else if (typeof(nestedSchema) === 'object' && !nestedSchema.ref) {
      currentAccValue = reduceSchemaRecursive.call(
        this,
        nestedSchema,
        reducer,
        currentAccValue,
        { paths: currentPaths, maxDepth, parentArrays: nextParentArrays }
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

function getRootCollectionFilter(projection) {
  if (!projection) return;
}

function getJoinPipeline(projection, maxDepth) {
  const pathsTree = this.schema._pathsTree;
  
  //Got to track lastArray
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
  const maxDepth = options.maxDepth || this.schema.options.maxDepth;
  const pathsTree = this.schema._pathsTree || reduceSchemaRecursive.call(this, this.schema.obj, (accumulator, property, schema, parentArrays) => {
    let type;
    if (schema.ref) type = 'ref';
    else if (Array.isArray(schema)) type = 'array';
    else type = 'path';
    return [...accumulator, { property, type, parentArrays }];
  }, [], { maxDepth });

  console.log(pathsTree);

  if (!this.schema._pathsTree) this.schema._pathsTree = pathsTree;

  const pipeline = [];

  const searchFilter = searchQueryToFilter.call(this, search);
  const resultFilter = getResultFilter(filter, searchFilter);

  const rootCollectionFilter = getRootCollectionFilter.call(this, projection);

  rootCollectionFilter && pipeline.push({ $match: rootCollectionFilter });

  const joinPipeline = getJoinPipeline.call(this, projection, maxDepth);
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