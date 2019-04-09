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
  const { paths = [], level = 0, maxDepth, projection, parentArrays, parentRef, collectionName } = context;
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
        { level, parentArrays, parentRef, collectionName })
      ) || accumulator;
    if (options.ref && ( nextDepth === true || nextDepth >= 0 ) && includePath) {
      const nextParentRef = currentPathsString;
      const targetModel = this.db.model(options.ref);
      const targetCollectionName = targetModel.collection.collectionName;
      currentAccValue = reduceSchemaRecursive.call(
        this,
        targetModel.schema,
        reducer,
        currentAccValue,
        {
          paths: currentPaths,
          level: level + 1,
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
          level: level + 1,
          maxDepth: nextDepth,
          projection,
          parentArrays: nextParentArrays
        }
      );
    } 
    return currentAccValue;
  }, initialValue);
}

const searchQueryToFilter = (schema, searchQuery) => {
  const { searchFields } = schema.options;
  if (!searchQuery || !searchFields) return;
  const filters = searchFields.map(searchField => {
    return { [searchField]: new RegExp(`.*${searchQuery}.*`, 'i') };
  });
  return { $or: filters};
};

const getJoinPipeline = pathsToJoin => {

  const joinPipeline = [];
  if (!pathsToJoin.length) return joinPipeline;

  const joinSteps = pathsToJoin.reduce((accumulator, path) => {
    const parts = path.property.split('.');
    const localField = parts.splice(0, parts.length - 1).join('.');
    const currentPipeline = [...accumulator];

    path.parentArrays && path.parentArrays.forEach(array => {
      const curPath = '$' + array;
      if (!accumulator.filter(step => step.$unwind).some(step => curPath === (step.$unwind.path || step.$unwind) ) ) {
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

  joinPipeline.push(...joinSteps);

  return joinPipeline;

};

const getGroupPipeline = (pathsMeta, pathsToJoin) => {

  const arrayPropertyIsInside = (arraysToCollect, currentArrayProperty) => {
    return arraysToCollect.some(rootItem => {
      return ( rootItem.property && rootItem.property === currentArrayProperty ) ||
          ( Array.isArray(rootItem) && arrayPropertyIsInside(rootItem, currentArrayProperty) ) ||
          false;
    });
  };

  const arraysToCollect = pathsToJoin.slice(0).reverse().reduce((arraysToCollect, path) => {
    if (path.parentArrays) {
      const nestedArrays = path.parentArrays.slice(0).reverse().reduce((nestedArrays, parentArrayProperty) => {
        if (!arrayPropertyIsInside(arraysToCollect, parentArrayProperty)) {
          const parentArray = pathsMeta.find(pathMeta => pathMeta.property === parentArrayProperty);
          return [...nestedArrays, parentArray];
        } else {
          return nestedArrays;
        }
      }, []);      
      return nestedArrays.length ? [...arraysToCollect, nestedArrays] : arraysToCollect;
    } else {
      return arraysToCollect;
    }
  }, []);

  let rootGroupProperties = pathsMeta.filter(path => {
    const isPlainArray = path.type === 'array' &&
        // Check if it's non-collectable array
        !arrayPropertyIsInside(arraysToCollect, path.property);
    return path.level === 0 && path.property !== '_id' &&
        ( path.type === 'path' || isPlainArray );
  });
  rootGroupProperties = rootGroupProperties.reduce((accumulator, path) => {
    // In case of nested objects, always pick the root property.
    const curPath = path.property.split('.')[0];
    return accumulator[curPath] ?
        accumulator :
        { ...accumulator, [curPath]: { $first: '$' + curPath } };
  }, {});

  const dotToUnderscore = property => property.replace(/\.+/g, '_');

  const getArrayProperties = (arraysToCollect, currentArray, underscoreNestedArrayProperty) => {
    return arraysToCollect.reduce((accumulator, item) => {
      const curProperty = '$' + item.property;
      const rootProperty = item.property.split('.')[0];
      if (item.property === currentArray.property) {
        return { ...accumulator, [underscoreNestedArrayProperty]: { $push: curProperty } };
      } else if (!accumulator[rootProperty]) {
        return  { ...accumulator, [rootProperty]: { $first: curProperty } };
      } else {
        return accumulator;
      }
    }, {});
  };

  const groupPipeline = arraysToCollect.reduce((groupPipeline, arrayToCollect) => {
    if (Array.isArray(arrayToCollect)) {
      const nestedPipeline = arrayToCollect.reduce((nestedPipeline, nestedArrayToCollect, index) => {
        const underscoreNestedArrayProperty = dotToUnderscore(nestedArrayToCollect.property);
        const arrayProperties = getArrayProperties(arrayToCollect, nestedArrayToCollect, underscoreNestedArrayProperty);
        // The result will be different for the last element,
        // so tracking if it's the last one or not
        if (index < arrayToCollect.length - 1) {
          return [
            ...nestedPipeline,
            {
              $group: {
                _id: { _id: '$_id', [dotToUnderscore(nestedArrayToCollect.parentRef)]: '$' + nestedArrayToCollect.parentRef + '._id' },
                ...rootGroupProperties,
                ...arrayProperties
              }
            }, 
            {
              $addFields: { [nestedArrayToCollect.property]: '$' + underscoreNestedArrayProperty }
            },
            {
              $project: { [underscoreNestedArrayProperty]: 0 }
            }
          ];
        } else {
          return [
            ...nestedPipeline,
            {
              $group: {
                 _id: '$_id._id',
                ...rootGroupProperties,
                ...arrayProperties
              } 
            }
          ]; 
        }
      }, []);
      return [
        ...groupPipeline,
        ...nestedPipeline
      ];
    } else {
      const arrayProperties = getArrayProperties(arraysToCollect, arrayToCollect);
      return [
        ...groupPipeline,
        {
          $group: {
            _id: '$_id',
            ...rootGroupProperties,
            ...arrayProperties
          }
        }
      ];
    }
  }, []);

  return groupPipeline;
};

const getJoinAndGroupPipeline = pathsMeta => {
  const pathsToJoin = pathsMeta.filter(path => path.property.includes('_id') && ( path.parentRef !== undefined ));
  const joinPipeline = getJoinPipeline(pathsToJoin);
  const groupPipeline = getGroupPipeline(pathsMeta, pathsToJoin);
  return [...joinPipeline, ...groupPipeline];
};

const getResultFilter = (filter, searchFilter) => {
  if (!filter && !searchFilter) return;
  const resultFilter = [];
  filter && resultFilter.push(filter);
  searchFilter && resultFilter.push(searchFilter);
  return resultFilter.length === 1 ? resultFilter[0] : { $and: resultFilter };
};

const treePathsComparator = (a, b) => {
  if (a.level > b.level) return 1;
  else if (a.level < b.level) return -1;
  else return a.property.localeCompare(b.property);
};

export function deepFind(options = {}) {

  const { skip, limit, projection, filter, sort, search } = options;
  let maxDepth;
  if (options.maxDepth || options.maxDepth === 0) maxDepth = options.maxDepth;
  else if (this.schema.options.maxDepth || this.schema.options.maxDepth === 0) maxDepth = this.schema.options.maxDepth;
  else maxDepth = 1;

  const pathsMeta = reduceSchemaRecursive.call(this, this.schema, (accumulator, property, schema, options, context) => {
    let type;
    if (schema.instance === 'Array') type = 'array';
    else if (schema.schema) type = 'schema';
    else if (options.ref) type = 'ref';
    else type = 'path';
    const newPath = { property, type, ...context };
    return [...accumulator, newPath];
  }, [], { maxDepth, projection }).sort(treePathsComparator);

  console.log(pathsMeta);

  const pipeline = [];

  const searchFilter = searchQueryToFilter(this.schema, search);
  const resultFilter = getResultFilter(filter, searchFilter);

  const joinAndGroupPipeline = getJoinAndGroupPipeline(pathsMeta, projection, maxDepth);
  joinAndGroupPipeline && pipeline.push(...joinAndGroupPipeline);

  resultFilter && pipeline.push({ $match: resultFilter });
  projection && pipeline.push({ $project: projection });
  sort && pipeline.push({ $sort: sort });
  skip && pipeline.push({ $skip: skip });
  limit && pipeline.push({ $limit: limit });

  return pipeline.length === 0 ? this.find() : this.aggregate(pipeline).allowDiskUse(true).exec();

}

const deepFindPlugin = schema => {
  schema.static('deepFind', deepFind);
  schema.static('deepFindOne', async function(options) {
    const result = await deepFind({ ...options, limit: 1 });
    return result.length > 0 ? result[0] : null;
  });
};

export default deepFindPlugin;