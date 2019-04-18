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
      await connection.model('DeepChild').deleteMany({});
      await connection.model('Child').deleteMany({});
      await connection.model('Root').deleteMany({});
      delete connection.models.DeepChild;
      delete connection.models.Child;
      delete connection.models.Root;
    };

    afterEach(clearDataAndModels);

    const createModels = (childSchema, rootSchema) => {
      rootSchema.plugin(deepFindPlugin);
      connection.model('DeepChild', childSchema);
      connection.model('Child', childSchema);
      connection.model('Root', rootSchema);
    };

    const createInstances = async ({ rootValues, childValues, deepChildValues }, count) => {
      let deepChildInstance, childInstance;
      const DeepChildModel = connection.model('DeepChild');
      const ChildModel = connection.model('Child');
      const RootModel = connection.model('Root');
      for (let i = 0; i < count; i++) {
        if (deepChildValues) deepChildInstance = await new DeepChildModel(deepChildValues).save();
        if (childValues) childInstance = await new ChildModel(childValues(deepChildInstance)).save();
        await new RootModel(rootValues(childInstance)).save();
      }
    };

    it('Preserves data structure with complex doc', async () => {
      const child = { type: Schema.Types.ObjectId, ref: 'Child' };
      const embeddedSchema = new Schema({ field: String, child });
      createModels(
        new Schema({ field: String }),
        new Schema({
          field: String,
          child,
          embedded: { field: String, child },
          embeddedSchema,
          array: [String],
          arrayOfEmbedded: [{ field: String, child }],
          arrayOfSchemas: [embeddedSchema],
          //arrayOfRefs: [child]
        })
      );
      await createInstances(
        {
          childValues: () => ({ field: 'test' }),
          rootValues: childInstance => ({
            field: 'test',
            child: childInstance,
            embedded: { field: 'test', child: childInstance },
            embeddedSchema: { field: 'test', child: childInstance },
            array: ['One', 'Two'],
            arrayOfEmbedded: [{ field: 'test 1', child: childInstance }, { field: 'test 2', child: childInstance }],
            arrayOfSchemas: [{ field: 'test 1', child: childInstance }, { field: 'test 2', child: childInstance }],
            //arrayOfRefs: [childInstance, childInstance]
          })
        },
        3
      );
      const Model = connection.model('Root');
      const result = await Model.deepFind({ maxDepth: true });
      console.log("%o", result);
      expect(result.length).to.equal(3);
      expect(result[0].field).to.equal('test');
      expect(result[0].child.field).to.equal('test');
      expect(result[0].embedded.field).to.equal('test');
      expect(result[0].embedded.child.field).to.equal('test');
      expect(result[0].embeddedSchema.field).to.equal('test');
      expect(result[0].embeddedSchema.child.field).to.equal('test');
      expect(result[0].array).to.deep.equal(['One', 'Two']);

      expect(result[0].arrayOfEmbedded.length).to.equal(2);
      expect(result[0].arrayOfEmbedded[0].field).to.equal('test 1');
      expect(result[0].arrayOfEmbedded[0].child.field).to.equal('test');
      expect(result[0].arrayOfEmbedded[1].field).to.equal('test 2');
      expect(result[0].arrayOfEmbedded[1].child.field).to.equal('test');

      expect(result[0].arrayOfSchemas.length).to.equal(2);
      expect(result[0].arrayOfSchemas[0].field).to.equal('test 1');
      expect(result[0].arrayOfSchemas[0].child.field).to.equal('test');
      expect(result[0].arrayOfSchemas[1].field).to.equal('test 2');
      expect(result[0].arrayOfSchemas[1].child.field).to.equal('test');

      expect(result[0].arrayOfRefs.length).to.equal(2);
      expect(result[0].arrayOfRefs[0].field).to.equal('test 1');
      expect(result[0].arrayOfRefs[0].child.field).to.equal('test');
      expect(result[0].arrayOfRefs[1].field).to.equal('test 2');
      expect(result[0].arrayOfRefs[1].child.field).to.equal('test');
    });

  });

});