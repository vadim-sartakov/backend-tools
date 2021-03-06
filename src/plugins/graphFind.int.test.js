import { expect } from 'chai';
import mongoose, { Schema } from 'mongoose';
import graphFindPlugin from './graphFind';

mongoose.set('debug', true);

describe('Mongoose deep find plugin', () => {

  let connection;

  before(async () => {
    connection = await mongoose.createConnection('mongodb://localhost/testdb', { useNewUrlParser: true });
  });

  after(async () => {
    await connection.dropDatabase();
    await connection.close(true);
  });

  const clearData = async () => {
    if (connection.models.DeepChild) {
      await connection.model('DeepChild').deleteMany({});
    }
    if (connection.models.Child) {
      await connection.model('Child').deleteMany({});
    }
    if (connection.models.Root) {
      await connection.model('Root').deleteMany({});
    }
  };

  const clearModels = () => {
    if (connection.models.DeepChild) {
      delete connection.models.DeepChild;
    }
    if (connection.models.Child) {
      delete connection.models.Child;
    }
    if (connection.models.Root) {
      delete connection.models.Root;
    }
  };

  describe('Projections', () => {

    const childSchema = new Schema({ field: String, number: String });
    const rootSchema = new Schema({ field: String, child: childSchema });

    let Root, Child;

    const populateDatabase = async count => {
      for (let i = 0; i < count; i++) {
        const child = await new Child({ field: 'Child field ' + i, number: i }).save();
        await new Root({ field: 'Root field ' + i, child }).save();
      }
    }; 

    before(async () => {
      rootSchema.plugin(graphFindPlugin);
      Child = connection.model('Child', childSchema);
      Root = connection.model('Root', rootSchema);
      await populateDatabase(10);
    });

    after(async () => {
      await clearData();
      clearModels();
    });

    it('No projection specified', async () => {
      const result = await Root.graphFind({ limit: 100 });
      expect(result.length).to.equal(10);
      expect(result[0].field).to.be.ok;
      expect(result[0].child).to.be.ok;
      expect(result[0].child.field).to.be.ok;
      expect(result[0].child.number).to.be.ok;
    });

    it('Inclusive projection of root property', async () => {
      const result = await Root.graphFind({ projection: { 'field': 1 } });
      expect(result.length).to.equal(10);
      expect(result[0].field).to.be.ok;
      expect(result[0].child).not.to.be.ok;
    });

    it('Exclusive projection of root property', async () => {
      const result = await Root.graphFind({ projection: { 'field': 0 } });
      expect(result.length).to.equal(10);
      expect(result[0].field).not.to.be.ok;
      expect(result[0].child).to.be.ok;
      expect(result[0].child.field).to.be.ok;
      expect(result[0].child.number).to.be.ok;
    });

    it('Inclusive projection of whole nested object', async () => {
      const result = await Root.graphFind({ projection: { 'child': 1 } });
      expect(result.length).to.equal(10);
      expect(result[0].field).not.to.be.ok;
      expect(result[0].child).to.be.ok;
      expect(result[0].child.field).to.be.ok;
      expect(result[0].child.number).to.be.ok;
    });

    it('Inclusive projection of part of nested object', async () => {
      const result = await Root.graphFind({ projection: { 'child.field': 1 } });
      expect(result.length).to.equal(10);
      expect(result[0].field).not.to.be.ok;
      expect(result[0].child).to.be.ok;
      expect(result[0].child.field).to.be.ok;
      expect(result[0].child.number).not.to.be.ok;
    });

    it('Exclusive projection of part of nested object', async () => {
      const result = await Root.graphFind({ projection: { 'child.field': 0 } });
      expect(result.length).to.equal(10);
      expect(result[0].field).to.be.ok;
      expect(result[0].child).to.be.ok;
      expect(result[0].child.field).not.to.be.ok;
      expect(result[0].child.number).to.be.ok;
    });

  });

  describe('Search', () => {

    const childSchema = new Schema({ field: String, number: String });
    const rootSchema = new Schema(
      {
        field: String,
        child: childSchema,
        arrayOfChildren: [childSchema]
      }, 
      {
        searchFields: ['field', 'child.field']
      }
    );

    let Root, Child;

    const populateDatabase = async count => {
      for (let i = 0; i < count; i++) {
        const child = await new Child({ field: 'Child field ' + i, number: i }).save();
        await new Root({ field: 'Root field ' + i, child, arrayOfChildren: [child] }).save();
      }
    };

    before(async () => {
      rootSchema.plugin(graphFindPlugin);
      Child = connection.model('Child', childSchema);
      Root = connection.model('Root', rootSchema);
      await populateDatabase(10);
    });

    after(async () => {
      await clearData();
      clearModels();
    });

    it('By root field', async () => {
      const result = await Root.graphFind({ search: 'oot Field 5' });
      expect(result.length).to.equal(1);
      expect(result[0].field).to.equal('Root field 5');
    });

    it('By nested field', async () => {
      const result = await Root.graphFind({ search: 'ild Field 5' });
      expect(result.length).to.equal(1);
      expect(result[0].child.field).to.equal('Child field 5');
    });

    it('By root and nested field', async () => {
      const result = await Root.graphFind({ search: 'Field' });
      expect(result.length).to.equal(10);
    });

  });

  describe('Different schema definitions', () => {
  
    afterEach(async () => {
      await clearData();
      clearModels();
    });

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

      rootSchema.plugin(graphFindPlugin);
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
      const rawActualResult = await RootModel.graphFind({ sort: { 'field': 1 }, maxDepth: true });
      const actualResult = JSON.parse(JSON.stringify(rawActualResult));
      expect(actualResult).to.deep.equal(expectedResult);

    });

  });

  describe('Graph find one', () => {

    afterEach(async () => {
      await clearData();
      clearModels();
    });

    it('String filter', async () => {
      const rootSchema = new Schema({ field: String });
      rootSchema.plugin(graphFindPlugin);
      const TestModel = connection.model('Root', rootSchema);
      await new TestModel({ field: "test" }).save();
      const result = await TestModel.graphFindOne({ filter: { field: "test" } });
      expect(result).to.be.ok;
    });

    it('Replaces string ids in filters with ObjectId', async () => {
      const childSchema = new Schema({ field: String });
      const rootSchema = new Schema({ field: String, child: { type: Schema.Types.ObjectId, ref: 'Child' } });
      rootSchema.plugin(graphFindPlugin);
      const ChildModel = connection.model('Child', childSchema);
      const TestModel = connection.model('Root', rootSchema);
      const childInstance = await new ChildModel({ field: "test" }).save();
      const firstRootInstance = await new TestModel({ field: "test", child: childInstance }).save();
      const secondRootInstance = await new TestModel({ field: "test", child: childInstance }).save();

      // If it's already object id
      let result = await TestModel.graphFindOne({ filter: { _id: new mongoose.Types.ObjectId(firstRootInstance.id) } });
      expect(result).to.be.ok;

      // If it's stringified object id
      result = await TestModel.graphFindOne({ filter: { _id: firstRootInstance.id } });
      expect(result).to.be.ok;

      result = await TestModel.graphFindOne({ filter: { "child": childInstance.id } });
      expect(result).to.be.ok;

      result = await TestModel.graphFindOne({ filter: { "child._id": childInstance.id } });
      expect(result).to.be.ok;

      result = await TestModel.graphFindOne({ filter: { _id: { $in: [firstRootInstance.id] } } });
      expect(result).to.be.ok;

      result = await TestModel.graphFindOne({ filter: { _id: { $not: { $in: [secondRootInstance.id] } } } });
      expect(result).to.be.ok;
      expect(result._id).to.deep.eq(firstRootInstance._id);
    });

  });

});