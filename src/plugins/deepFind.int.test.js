import { expect } from 'chai';
import mongoose, { Schema, SchemaType } from 'mongoose';
import deepFindPlugin from './deepFind';

mongoose.set('debug', true);

describe.only('Mongoose deep find plugin', () => {

  let connection, Model;

  const createModels = (connection, maxDepth, currentLevel = 0) => {
    const nextLevel = currentLevel + 1;
    const ref = nextLevel < maxDepth ? { type: Schema.Types.ObjectId, ref: 'Model' + nextLevel.toString() } : undefined;

    const embeddedDoc = {
      plainField: String,
      arrayOfPlainValues: [String],
    };

    if (ref) {
      embeddedDoc.ref = ref;
      embeddedDoc.arrayOfRefs = [ref];
    }

    const embeddedSchema = new Schema(embeddedDoc);

    const modelSchemaObj = {
      plainField: String,
      embeddedDoc,
      embeddedSchema,
      arrayOfPlainValues: [String],
      arrayOfEmbeddedDocs: [embeddedDoc],
      arrayOfEmbeddedSchemas: [embeddedSchema]
    };

    if (ref) {
      modelSchemaObj.ref = ref;
      modelSchemaObj.arrayOfRefs = [ref];
    }

    const modelSchema = new Schema(modelSchemaObj);
    currentLevel === 0 && modelSchema.plugin(deepFindPlugin);
    connection.model('Model' + currentLevel, modelSchema);

    if (currentLevel < maxDepth) {
      createModels(connection, maxDepth, currentLevel + 1);
    }
  };

  const fillGraph = async (instance, maxDepth, currentLevel = 0) => {
    if (currentLevel < maxDepth) {
      const child = await fillGraph(instance, maxDepth, currentLevel + 1);
    }
  };

  before(async () => {
    connection = await mongoose.createConnection('mongodb://localhost/testdb', { useNewUrlParser: true });
    createModels(connection, 2);
    Model = connection.model('Model0');
    await fillGraph();
  });

  after(async () => {
    await connection.dropDatabase();
    await connection.close(true);
  });

  it.only('Loads whole tree with default depth when no options specified', async () => {
    const result = await Model.deepFind();
    expect(result).to.be.ok;
    //expect(result.length).to.equal(3);
    console.log(JSON.stringify(result, null, 4));
  });

  it('Skip 1 limit 1', async () => {
    const result = await Order.deepFind({ skip: 1, limit: 1 });
    expect(result).to.be.ok;
    expect(result.length).to.equal(1);
  });

  it('Search', async () => {
    const result = await Order.deepFind({ search: 'i5' });
    expect(result).to.be.ok;
    expect(result.length).to.equal(2);
  });

});