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
  
    beforeEach(async () => {
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

});