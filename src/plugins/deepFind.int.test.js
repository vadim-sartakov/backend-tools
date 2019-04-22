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

    it('Preserves data structure with complex doc', async () => {
      const child = { type: Schema.Types.ObjectId, ref: 'Child' };
      const embeddedSchema = new Schema({ field: String, child, eeeeee: [child] });
      const childSchema = new Schema({ field: String });
      const rootSchema = new Schema({
        field: String,
        //child,
        //embedded: { field: String, child, arrayOfRefs: [child] },
        //embeddedSchema,
        //array: [String],
        //arrayOfEmbedded: [{ field: String, child }],
        arrayOfSchemas: [embeddedSchema],
        //arrayOfRefs: [child]
      });

      rootSchema.plugin(deepFindPlugin);
      const DeepChildModel = connection.model('DeepChild', childSchema);
      const ChildModel = connection.model('Child', childSchema);
      const RootModel = connection.model('Root', rootSchema);
      
      const childOne = await new ChildModel({ field: 'test 1' }).save();
      const childTwo = await new ChildModel({ field: 'test 2' }).save();

      const rootOne = await new RootModel({
        field: 'test 1',
        //child: childOne,
        //embedded: { field: 'test 1', child: childOne, arrayOfRefs: [childOne, childTwo] },
        //embeddedSchema: { field: 'test 1', child: childOne, arrayOfRefs: [childOne, childTwo] },
        //array: ['One', 'Two'],
        //arrayOfEmbedded: [{ field: 'test 1', child: childOne }, { field: 'test 2', child: childOne }],
        arrayOfSchemas: [{ field: 'test 1', child: childOne, eeeeee: [childOne] }, { field: 'test 2', child: childOne, eeeeee: [childOne] }],
        //arrayOfRefs: [childOne, childTwo]
      }).save();
      const rootTwo = await new RootModel({
        field: 'test 2',
        //child: childOne,
        //embedded: { field: 'test 2', child: childOne, arrayOfRefs: [childOne, childTwo] },
        //embeddedSchema: { field: 'test 2', child: childOne },
        //array: ['One', 'Two'],
        //arrayOfEmbedded: [{ field: 'test 1', child: childOne }, { field: 'test 2', child: childOne }],
        arrayOfSchemas: [{ field: 'test 1', child: childOne, eeeeee: [childTwo] }, { field: 'test 2', child: childOne, eeeeee: [childTwo] }],
        //arrayOfRefs: [childOne, childTwo]
      }).save();

      const expectedResult = JSON.parse(JSON.stringify([rootOne, rootTwo]));
      //const rawActualResult = await RootModel.deepFind({ sort: { 'field': 1 } });
      const rawActualResult = await RootModel.aggregate([
        { '$unwind': { path: '$arrayOfSchemas', preserveNullAndEmptyArrays: true } },
        { '$lookup': { from: 'children', localField: 'arrayOfSchemas.child', foreignField: '_id', as: 'arrayOfSchemas.child' } },
        { '$unwind': { path: '$arrayOfSchemas.child', preserveNullAndEmptyArrays: true } },
        { '$group': { __v: { '$first': '$__v' }, arrayOfSchemas: { '$push': '$arrayOfSchemas' }, field: { '$first': '$field' }, _id: '$_id' } },
        { '$unwind': { path: '$arrayOfSchemas', preserveNullAndEmptyArrays: true, includeArrayIndex: 'arrayOfSchemas._index' } },
        { '$unwind': { path: '$arrayOfSchemas.eeeeee', preserveNullAndEmptyArrays: true, includeArrayIndex: 'arrayOfSchemas.eeeeee._index' } },
        { '$lookup': { from: 'children', localField: 'arrayOfSchemas.eeeeee', foreignField: '_id', as: 'arrayOfSchemas.eeeeee' } },
        { '$unwind': { path: '$arrayOfSchemas.eeeeee', preserveNullAndEmptyArrays: true } },
        { '$group': { __v: { '$first': '$__v' }, arrayOfSchemas: { '$first': '$arrayOfSchemas' }, field: { '$first': '$field' }, arrayOfSchemas_eeeeee: { '$push': '$arrayOfSchemas.eeeeee' }, _id: { _id: '$_id', arrayOfSchemas_eeeeee: '$arrayOfSchemas._id' } } },
        { '$sort': { 'arrayOfSchemas._index': 1 } },
        { '$project': { 'arrayOfSchemas._index': 0, 'arrayOfSchemas.eeeeee._index': 0 } },
        { '$addFields': { 'arrayOfSchemas.eeeeee': '$arrayOfSchemas_eeeeee' } },
        { '$project': { arrayOfSchemas_eeeeee: 0 } },
        { '$group': { __v: { '$first': '$__v' }, arrayOfSchemas: { '$push': '$arrayOfSchemas' }, field: { '$first': '$field' }, _id: '$_id._id' } },
        { '$sort': { field: 1 } }
      ]);
      const actualResult = JSON.parse(JSON.stringify(rawActualResult));
      console.log(JSON.stringify([rootOne, rootTwo]));
      console.log('===============================================');
      console.log(JSON.stringify(rawActualResult));
      expect(actualResult).to.deep.equal(expectedResult);

    });

  });

});