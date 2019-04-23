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
      if (connection.models.DeepChild) {
        await connection.model('DeepChild').deleteMany({});
        delete connection.models.DeepChild;
      }
      if (connection.models.Child) {
        await connection.model('Child').deleteMany({});
        delete connection.models.Child;
      }
      if (connection.models.Root) {
        await connection.model('Root').deleteMany({});
        delete connection.models.Root;
      }
    };

    beforeEach(clearDataAndModels);

    it('Preserves data structure with complex doc', async () => {
      const deepChild = { type: Schema.Types.ObjectId, ref: 'DeepChild' };
      const child = { type: Schema.Types.ObjectId, ref: 'Child' };
      const embeddedSchema = new Schema({ field: String, child, arrayOfRefs: [child] });
      const deepChildSchema = new Schema({ field: String });
      const childSchema = new Schema({ field: String, deepChild });
      const rootSchema = new Schema({
        field: String,
        child,
        embedded: { field: String, child, arrayOfRefs: [child] },
        embeddedSchema,
        array: [String],
        arrayOfEmbedded: [{ field: String, child }],
        arrayOfSchemas: [embeddedSchema],
        arrayOfRefs: [child]
      });

      rootSchema.plugin(deepFindPlugin);
      const DeepChildModel = connection.model('DeepChild', deepChildSchema);
      const ChildModel = connection.model('Child', childSchema);
      const RootModel = connection.model('Root', rootSchema);
      
      const deepChildOne = await new DeepChildModel({ field: 'test 1' }).save();

      const childOne = await new ChildModel({ field: 'test 1' }).save();
      const childTwo = await new ChildModel({ field: 'test 2' }).save();
      const childThree = await new ChildModel({ field: 'test 3', deepChild: deepChildOne }).save();

      const rootOne = await new RootModel({
        field: 'test 1',
        child: childThree,
        embedded: { field: 'test 1', child: childThree, arrayOfRefs: [childOne, childTwo, childThree] },
        embeddedSchema: { field: 'test 1', child: childThree, arrayOfRefs: [childOne, childTwo, childThree] },
        array: ['One', 'Two'],
        arrayOfEmbedded: [{ field: 'test 1', child: childThree }, { field: 'test 2', child: childThree }],
        arrayOfSchemas: [{ field: 'test 1', child: childThree, arrayOfRefs: [childOne, childTwo, childThree] }, { field: 'test 2', child: childOne, arrayOfRefs: [childOne, childTwo] }],
        arrayOfRefs: [childOne, childTwo, childThree]
      }).save();
      const rootTwo = await new RootModel({
        field: 'test 2',
        child: childOne,
        embedded: { field: 'test 2', child: childOne, arrayOfRefs: [childOne, childTwo] },
        embeddedSchema: { field: 'test 2', child: childOne, arrayOfRefs: [childOne, childTwo] },
        array: ['One', 'Two'],
        arrayOfEmbedded: [{ field: 'test 1', child: childOne }, { field: 'test 2', child: childOne }],
        arrayOfSchemas: [{ field: 'test 1', child: childOne, arrayOfRefs: [childTwo, childOne] }, { field: 'test 2', child: childOne, arrayOfRefs: [childTwo, childOne] }],
        arrayOfRefs: [childOne, childTwo]
      }).save();

      const expectedResult = JSON.parse(JSON.stringify([rootOne, rootTwo]));
      const rawActualResult = await RootModel.deepFind({ sort: { 'field': 1 }, maxDepth: true });
      const actualResult = JSON.parse(JSON.stringify(rawActualResult));
      console.log(JSON.stringify([rootOne, rootTwo]));
      console.log('===============================================');
      console.log(JSON.stringify(rawActualResult));
      expect(actualResult).to.deep.equal(expectedResult);

    });

  });

});