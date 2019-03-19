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
  const { paths = [], maxDepth, projection, parentArrays, parentRef, collectionName } = context;
  return Object.keys(schema.paths).reduce((accumulator, path) => {
    const currentSchemaPath = schema.paths[path];
    const options = ( currentSchemaPath.caster && currentSchemaPath.caster.options ) || currentSchemaPath.options;
    const currentPaths = [...paths, path];
    const currentPathsString = currentPaths.join('.');
    const nextDepth = maxDepth === true ? maxDepth : maxDepth - 1;
    const nextParentArrays = currentSchemaPath.instance === 'Array' ? [...(parentArrays || []), currentPathsString] : parentArrays;
    const includePath = shouldIncludePath(currentPathsString, projection);

    let currentAccValue = (includePath && reducer(
        accumulator,
        currentPathsString,
        currentSchemaPath,
        options,
        { parentArrays, parentRef, collectionName })
      ) || accumulator;
    if (options.ref && ( nextDepth === true || nextDepth >= 0 ) && includePath) {
      const nextParentRef = path;
      const targetModel = this.db.model(options.ref);
      const targetCollectionName = targetModel.collection.collectionName;
      currentAccValue = reduceSchemaRecursive.call(
        this,
        targetModel.schema,
        reducer,
        currentAccValue,
        {
          paths: currentPaths,
          maxDepth: nextDepth,
          projection,
          parentArrays: nextParentArrays,
          parentRef: nextParentRef,
          collectionName: targetCollectionName
        }
      );
    } else if (currentSchemaPath.schema && includePath) {
      currentAccValue = reduceSchemaRecursive.call(
        this,
        currentSchemaPath.schema,
        reducer,
        currentAccValue,
        {
          paths: currentPaths,
          maxDepth: nextDepth,
          projection,
          parentArrays: nextParentArrays
        }
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
  const joinPipeline = [];
  const pathsToJoin = pathsTree.filter(path => path.property.includes('_id') && ( path.parentRef !== undefined ));
  if (!pathsToJoin.length) return joinPipeline;

  const joinSteps = pathsToJoin.reduce((accumulator, path) => {
    const parts = path.property.split('.');
    const localField = parts.splice(0, parts.length - 1).join('.');
    const currentPipeline = [...accumulator];

    path.parentArrays && path.parentArrays.forEach(array => {
      const curPath = '$' + array;
      if (!accumulator.some(step => step.$unwind === curPath ) ) {
        currentPipeline.push({
          $unwind: {
            path: curPath,
            preserveNullAndEmptyArrays: true
          }
        });
      }
    });

    currentPipeline.push(
      {
        $lookup: {
          from: path.collectionName,
          localField,
          foreignField: '_id',
          as: localField
        }
      },
      {
        $unwind: {
          path: '$' + localField,
          preserveNullAndEmptyArrays: true
        }
      }
    );
    return currentPipeline;
  }, []);

  console.log(joinSteps);

  joinPipeline.push(...joinSteps);

  const groupProperties = pathsTree.reverse().reduce((accumulator, path) => {
    if (path.property === '_id') return accumulator;
    if (path.type === 'path' && !path.parentArrays) return { ...accumulator, [path.property]: { $first: '$' + path.property } };
    else if (path.type === 'array') return { ...accumulator, [path.property]: { $push: '$' + path.property } };
    else return accumulator;
  }, {});

  const groupStep = {
    $group: {
      _id: '$_id',
      ...groupProperties
    }
  };

  //joinPipeline.push(groupStep);

  return joinPipeline;

}

const getResultFilter = (filter, searchFilter) => {
  if (!filter && !searchFilter) return;
  const resultFilter = [];
  filter && resultFilter.push(filter);
  searchFilter && resultFilter.push(searchFilter);
  return resultFilter.length === 1 ? resultFilter[0] : { $and: resultFilter };
};

export function deepFind(options = {}) {

  const { skip, limit, projection, filter, sort, search } = options;
  let maxDepth;
  if (options.maxDepth || options.maxDepth === 0) maxDepth = options.maxDepth;
  else if (this.schema.options.maxDepth || this.schema.options.maxDepth === 0) maxDepth = this.schema.options.maxDepth;
  else maxDepth = 1;

  const pathsTree = reduceSchemaRecursive.call(this, this.schema, (accumulator, property, schema, options, context) => {
    let type;
    if (schema.instance === 'Array') type = 'array';
    else if (schema.schema) type = 'shema';
    else if (options.ref) type = 'ref';
    else type = 'path';
    const newPath = { property, type, ...context };
    return [...accumulator, newPath];
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
  schema.static('deepFind', deepFind);
  schema.static('deepFindOne', async function(options) {
    const result = await deepFind({ ...options, limit: 1 });
    return result.length > 0 ? result[0] : null;
  });
};

export default deepFindPlugin;