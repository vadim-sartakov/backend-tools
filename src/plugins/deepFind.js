const eachPathRecursive = (connection, schemaObject, callback, paths = []) => {
  Object.keys(schemaObject).forEach(property => {
    let value = schemaObject[property];
    value = value[0] || value;
    if (value.ref) {
      const targetModel = connection.model(value.ref);
      eachPathRecursive(connection, targetModel.schema.obj, callback);
    }
    paths.push(property);
    callback(paths.join('.'), value);
  });
};

export function deepFindAll(options = {}) {

  const { skip, limit, projection, filter, sort, search } = options;

  const pipeline = [];
  skip && pipeline.push({ $skip: skip });
  limit && pipeline.push({ $limit: limit });

  eachPathRecursive(this.db, this.schema.obj, (property, schema) => {

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