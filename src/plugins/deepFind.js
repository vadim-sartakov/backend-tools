function eachPathRecursive(schemaObject, callback, paths = []) {
  Object.keys(schemaObject).forEach(property => {
    const value = schemaObject[property];
    const nestedSchema = Array.isArray(value) ? value[0].obj : value;
    const currentPaths = [...paths, property];
    if (nestedSchema.ref) {
      const targetModel = this.connection.model(nestedSchema.ref);
      eachPathRecursive(targetModel.schema.obj, callback, currentPaths);
    } else if (typeof(nestedSchema) === 'object') {
      eachPathRecursive(nestedSchema, callback, currentPaths);
    }
    callback(currentPaths.join('.'), value);
  });
}

export function deepFindAll(options = {}) {

  const { skip, limit, projection, filter, sort, search } = options;

  const pipeline = [];
  skip && pipeline.push({ $skip: skip });
  limit && pipeline.push({ $limit: limit });

  eachPathRecursive.call(this.schema.obj, (property, schema) => {
    //schema.ref === reference;
    //Array.isArray(schema) === array;
  });

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