import { expect } from 'chai';
import mongoose, { Schema } from 'mongoose';
import deepFindPlugin from './deepFind';

mongoose.set('debug', true);

describe.only('Mongoose deep find plugin', () => {

  let connection;

  before(async () => {
    connection = await mongoose.createConnection('mongodb://localhost/testdb', { useNewUrlParser: true });
  });

  after(async () => {
    await connection.dropDatabase();
    await connection.close(true);
  });

  describe('Different schema definitions', () => {
    
    const clearDataAndModels = async () => {
      await connection.model('Child').deleteMany({});
      await connection.model('Root').deleteMany({});
      delete connection.models.Root;
      delete connection.models.Child;
    };

    afterEach(clearDataAndModels);

    const createModels = (childSchema, rootSchema) => {
      rootSchema.plugin(deepFindPlugin);
      connection.model('Child', childSchema);
      connection.model('Root', rootSchema);
    };

    const createInstances = async (childValues, rootValuesProvider, count) => {
      const ChildModel = connection.model('Child');
      const RootModel = connection.model('Root');
      for (let i = 0; i < count; i++) {
        let childInstance = await new ChildModel(childValues).save();
        await new RootModel(rootValuesProvider(childInstance)).save();
      }
    };

    it('Ref on root level', async () => {
      const embeddedSchema = new Schema({ field: String });
      createModels(
        new Schema({ field: String }),
        new Schema({
          field: String,
          embedded: { field: String },
          embeddedSchema,
          array: [String],
          ref: { type: Schema.Types.ObjectId, ref: 'Child' }
        }, { maxDepth: true })
      );
      await createInstances(
        { field: 'test' },
        childInstance => ({
          field: 'test',
          embedded: { field: 'test' },
          embeddedSchema: { field: 'test' },
          array: ['One', 'Two'],
          ref: childInstance
        }),
        3
      );
      const Model = connection.model('Root');
      const result = await Model.deepFind();
      expect(result.length).to.equal(3);
      expect(result[0].field).to.equal('test');
      expect(result[0].embedded.field).to.equal('test');
      expect(result[0].embeddedSchema.field).to.equal('test');
      expect(result[0].array).to.deep.equal(['One', 'Two']);
      expect(result[0].ref.field).to.equal('test');
    });

  });

});