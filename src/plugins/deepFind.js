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
}

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

  const groupPipeline = [];

  let arraysToCollect = pathsToJoin.reduce((accumulator, path) => {
    if (path.parentArrays) {
      const result = [...accumulator];
      path.parentArrays.forEach(parentArray => {
        if (accumulator.indexOf(parentArray) === -1) {
          result.push(parentArray);
        }
      });
      return result;
    } else {
      return accumulator;
    }
  }, []);

  arraysToCollect = arraysToCollect.map(array => {
    return pathsMeta.find(pathMeta => pathMeta.property === array);
  });

  const rootGroupProperties = pathsMeta
      .filter(path => {
        const isPlainArray = path.type === 'array' &&
            !arraysToCollect.some(arrayToCollect => arrayToCollect.property === path.property);
        return path.level === 0 && path.property !== '_id' &&
            ( path.type === 'path' || isPlainArray );
      })
      .reduce((accumulator, path) => {
        // In case of nested objects, always pick the root property.
        const curPath = path.property.split('.')[0];
        return accumulator[curPath] ?
            accumulator :
            { ...accumulator, [curPath]: { $first: '$' + curPath } };
      }, {});

  const processedArrays = [];
  const groupStep1 = [];

  const getArrayProperties = (arraysToCollect, currentArray) => {
    return arraysToCollect.map(item => {
      const curProperty = '$' + item.property;
      return item.property === currentArray ?
          { $push: curProperty } :
          { $first: curProperty };
    });
  };

  arraysToCollect.reverse().forEach(arrayToCollect => {
    const group = {
      ...rootGroupProperties
    };
    if (arrayToCollect.parentArrays) {
      arrayToCollect.parentArrays.forEach(parentArray => {
        if (processedArrays.indexOf(parentArray) !== -1) return;
        
        processedArrays.push(parentArray);
      });
    } else {
      groupStep1.push({
        $group: {
          _id: '$_id',
          ...rootGroupProperties
        }
      });
    }
    if (arrayToCollect.parentRef) {
      group._id = { _id: '$_id', [arrayToCollect.parentRef]: '$' + arrayToCollect.parentRef + '._id'  };
      group[arrayToCollect.property.replace(/\./g, '_')] = { $push: '$' + arrayToCollect.property };
      const remainedArrays = arraysToCollect.filter(item => item.property !== arrayToCollect.property);
      remainedArrays.forEach(item => group[item.property] = { $first: '$' + item.property });
    } else {
      group._id = '$_id';
    }
  }, []);

  const groupStep = {
    $group: {
      _id: { _id: '$_id', product: '$items.product._id' },
      ...rootGroupProperties,
      items: { $first: '$items' },
      items_product_specs: { $push: '$items.product.specs' }
    }
  };

  groupPipeline.push(groupStep);

  groupPipeline.push(
    {
      $addFields: {
        'items.product.specs': '$items_product_specs'
      }
    }
  );

  groupPipeline.push(
    {
      $project: {
        'items_product_specs': 0
      }
    }
  );

  groupPipeline.push(
    {
      $group: {
        _id: '$_id._id',
        ...rootGroupProperties,
        items: { $push: '$items' }
      }
    }
  );

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