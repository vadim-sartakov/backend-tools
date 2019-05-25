import mongoose from 'mongoose';

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
          parentRef: currentPathsString,
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
          level,
          maxDepth,
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

const dotToUnderscore = property => property.replace(/\.+/g, '_');

const getRootGroupProperties = pathsMeta => {
  let rootGroupProperties = pathsMeta.filter(path => {
    return path.level === 0 && path.property !== '_id';
  });
  rootGroupProperties = rootGroupProperties.reduce((accumulator, path) => {
    // In case of nested objects, always pick the root property.
    const curPath = path.property.split('.')[0];
    return accumulator[curPath] ?
        accumulator :
        { ...accumulator, [curPath]: { $first: '$' + curPath } };
  }, {});
  return rootGroupProperties;
};

const getJoinAndGroupPipeline = pathsMeta => {
  const pathsToJoin = pathsMeta.filter(path => path.property.includes('_id') && ( path.parentRef !== undefined ));
  if (!pathsToJoin.length) return [];

  const rootGroupProperties = getRootGroupProperties(pathsMeta);

  // Grouping by parent arrays property, so references same level deep
  // should be processed by the same step
  const groupedPaths = pathsToJoin.reduce((accumulator, path, index) => {
    const key = ( path.parentArrays && path.parentArrays.join('_') ) || 'root';
    const entry = ( accumulator[key] && Object.assign({}, accumulator[key]) ) || { parentArrays: path.parentArrays, paths: [], index };
    entry.paths.push(path);
    return { ...accumulator, [key]: entry };
  }, {});
  const groupedByParentArrays = Object.keys(groupedPaths).reduce((accumulator, key) => {
    const value = groupedPaths[key];
    return [...accumulator, value];
  }, []).sort((a, b) => a.index > b.index ? 1 : a.index < b.index ? - 1 : 0 );

  const pipeline = groupedByParentArrays.reduce((accumulator, item) => {
    const result = [...accumulator];
    item.parentArrays && item.parentArrays.forEach((array, index, sourceArray) => {
      const curPath = '$' + array;
      const $unwind = {
          path: curPath,
          preserveNullAndEmptyArrays: true
      };
      // Since grouping does not guarantee order, we have to maintain
      // array indexes to restore order right after grouping
      if (sourceArray.length > 1) $unwind.includeArrayIndex = 'indexes.' + dotToUnderscore(array);
      result.push({ $unwind });
    });

    item.paths.forEach(path => {
      const parts = path.property.split('.');
      const localField = parts.splice(0, parts.length - 1).join('.');
      result.push(
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
    });

    // Executing revere here to make sure deep nested references go first
    item.parentArrays && item.parentArrays.slice(0).reverse().forEach((arrayItem, index, array) => {
      const curPath = '$' + arrayItem;
      const nextArray = array[index + 1];
      // Since grouping does not support dot-notatation in properties,
      // making some workaround here by replacing dot's with underscores and adding another
      // pipeline steps to fix the issue.
      const underscoredPath = arrayItem.includes('.') && dotToUnderscore(arrayItem);
      const arrayGroupProperty = { [underscoredPath || arrayItem]: { $push: curPath } };

      const groupStep = {
        ...rootGroupProperties,
        ...arrayGroupProperty
      };

      if (array.length === 1) {
        groupStep._id = '$_id';
      } else if (index < array.length - 1) {
        groupStep._id = {
          _id: '$_id',
          // TODO: make some checks to prevent grouping array rows without ids
          [underscoredPath || arrayItem]: '$' + nextArray + '._id'
        };
        // Indexes property will not be preserved on the last step
        groupStep.indexes = { $first: '$indexes' };
      } else {
        groupStep._id = '$_id._id';
      }

      result.push({ $group: groupStep });

      if (index < array.length - 1) {
        const nextArrayIndexProperty = 'indexes.' + dotToUnderscore(nextArray);
        result.push({ $sort: { [nextArrayIndexProperty]: 1 } });
      }

      if (underscoredPath) {
        result.push(
          {
            $addFields: { [arrayItem]: '$' + underscoredPath }
          },
          {
            $project: { [underscoredPath]: 0 }
          }
        );
      }
    });

    return result;
  }, []);

  return pipeline;
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

const stringIdsToObjectIds = filterValue => {
  const filterValueType = typeof filterValue;
  if (filterValueType === 'string') {
    return new mongoose.Types.ObjectId(filterValue);
  } else if (filterValue !== null && filterValueType === 'object') {
    if (Array.isArray(filterValue)) {
      return filterValue.map(value => new mongoose.Types.ObjectId(value));
    } else {
      return Object.entries(filterValue).reduce((accumulator, [key, value]) => {
        return { ...accumulator, [key]: stringIdsToObjectIds(value) };
      }, {});
    }
  }
};

const pathIsId = (pathsMeta, path) => {
  return path.includes('_id') || pathsMeta.some(pathMeta => pathMeta.type === 'ref');
};

const convertFilterIds = (pathsMeta, filter) => {
  if (!filter) return;
  return Object.entries(filter).reduce((accumulator, [key, value]) => {
    if (pathIsId(pathsMeta, key)) {
      const convertedValue = stringIdsToObjectIds(value);
      const nextKey = ;
      return { ...accumulator, [key]: convertedValue };
    } else {
      return { ...accumulator, [key]: value };
    }
  }, {});
};

export function graphFind(options = {}) {

  const { skip, limit, projection, sort, search } = options;
  
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

  let { filter } = options;
  filter = convertFilterIds(pathsMeta, filter);

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

async function graphFindOne(options) {
  const result = await graphFind.call(this, { ...options, limit: 1 });
  return result.length > 0 ? result[0] : null;
}

const graphFindPlugin = schema => {
  schema.static('graphFind', graphFind);
  schema.static('graphFindOne', graphFindOne);
};

export default graphFindPlugin;