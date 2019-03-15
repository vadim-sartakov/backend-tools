function reduceSchemaRecursive(schemaObject, reducer, initialValue, paths = []) {
  return Object.keys(schemaObject).reduce((accumulator, property) => {
    const value = schemaObject[property];
    const nestedSchema = Array.isArray(value) ? value[0].obj : value;
    const currentPaths = [...paths, property];
    let currentAccValue = reducer(accumulator, currentPaths.join('.'), value);
    if (nestedSchema.ref) {
      const targetModel = this.db.model(nestedSchema.ref);
      currentAccValue = reduceSchemaRecursive.call(this, targetModel.schema.obj, reducer, currentAccValue, currentPaths);
    } else if (typeof(nestedSchema) === 'object') {
      currentAccValue = reduceSchemaRecursive.call(this, nestedSchema, reducer, currentAccValue, currentPaths);
    }
    return currentAccValue;
  }, initialValue);
}

export function deepFindAll(options = {}) {

  const { skip, limit, projection, filter, sort, search } = options;

  const pipeline = [];
  skip && pipeline.push({ $skip: skip });
  limit && pipeline.push({ $limit: limit });

  const pathsMeta = reduceSchemaRecursive.call(this, this.schema.obj, (accumulator, property, schema) => {
    let type;
    if (schema.ref) type = 'ref';
    else if (Array.isArray(schema)) type = 'array';
    else type = 'path';
    return [...accumulator, { property, type }];
  }, []);

  const arrays = pathsMeta.filter(path => path.type === 'array').map(pathMeta => pathMeta.property);
  const refs = pathsMeta.filter(path => path.type === 'ref').map(pathMeta => pathMeta.property);

  console.log(pathsMeta);
  console.log(arrays);
  console.log(refs);

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