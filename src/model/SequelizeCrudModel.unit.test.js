import chai, { expect } from 'chai';
import { fake } from 'sinon';
import sinonChai from 'sinon-chai';
import SequelizeCrudModel from './SequelizeCrudModel';

chai.use(sinonChai);

class StubModel {
  constructor() {
    this.findAll = fake();
  }
}

describe('Sequelize crud model', () => {

  describe('queryOptions', () => {

    let model;
    beforeEach(() => model = new SequelizeCrudModel());

    const addressModel = {
      attributes: {
        id: {},
        city: {}
      }
    };

    const individualModel = {
      attributes: {
        id: {},
        name: {},
        birthdate: {}
      },
      associations: {
        address: { target: addressModel }
      }
    };

    const roleModel = {
      attributes: {
        id: {},
        name: {},
        key: {}
      }
    };

    const userModel = {
      attributes: {
        id: {},
        name: {}
      },
      associations: {
        individual: { target: individualModel },
        roles: { target: roleModel }
      }
    };

    describe('Empty projection', () => {

      it('Shallow', () => {
        const result = model.queryOptions(userModel);
        expect(result).to.deep.equal({
          include: [
            { association: 'individual' },
            { association: 'roles' }
          ]
        });
      });

      it('Deep', () => {
        const result = model.queryOptions(userModel, { depthLevel: 2 });
        expect(result).to.deep.equal({
          include: [
            {
              association: 'individual',
              include: [{
                association: 'address'
              }]
            },
            { association: 'roles' }
          ]
        });
      });

    });

    describe('Inclusive', () => {

      it('One level deep', () => {
        const projection = ['individual', 'individual.address'];
        const result = model.queryOptions(userModel, { projection, depthLevel: 1 });
        expect(result).to.deep.equal({
          include: [{
            association: 'individual'
          }]
        });
      });

      it('Root level attribute', () => {
        const projection = ['name'];
        const result = model.queryOptions(userModel, { projection });
        expect(result).to.deep.equal({
          attributes: ['name']
        });
      });

      it('Load nested by fields', () => {
        const projection = ['individual.name', 'individual.address.city'];
        const result = model.queryOptions(userModel, { projection, depthLevel: 2 });
        expect(result).to.deep.equal({
          include: [
            {
              association: 'individual',
              attributes: ['name'],
              include: [{
                association: 'address',
                attributes: ['city']
              }]
            }
          ]
        });
      });

    });

    describe('Exclusive', () => {

      it('One level deep', () => {
        const projection = { exclude: ['name'] };
        const result = model.queryOptions(userModel, { projection });
        expect(result).to.deep.equal({
          attributes: { exclude: ['name'] },
          include: [{
            association: 'individual'
          }, {
            association: 'roles'
          }]
        });
      });

      it('Exclude root property', () => {
        const projection = { exclude: ['name'] };
        const result = model.queryOptions(userModel, { projection, depthLevel: 2 });
        expect(result).to.deep.equal({
          attributes: { exclude: ['name'] },
          include: [{
            association: 'individual',
            include: [{
              association: 'address',
            }]
          }, {
            association: 'roles'
          }]
        });
      });

      it('Exclude deep nested property', () => {
        const projection = { exclude: ['individual.id', 'individual.address.id'] };
        const result = model.queryOptions(userModel, { projection, depthLevel: 2 });
        expect(result).to.deep.equal({
          include: [{
            association: 'individual',
            attributes: { exclude: ['id'] },
            include: [{
              association: 'address',
              attributes: { exclude: ['id'] }
            }]
          }, {
            association: 'roles'
          }]
        });
      });

    });

  });

  describe('loadFieldsToInclude', () => {

    let model;
    before(() => model = new SequelizeCrudModel());

    it('Flat', () => {
      expect(
          model.loadFieldsToInclude({ employees: 'id name' })
      ).to.deep.equal([
        {
          association: 'employees',
          attributes: ['id', 'name'],
          duplicating: false
        }
      ]);
    });

    it('Nested', () => {
      expect(
          model.loadFieldsToInclude({
            employees: {
              projection: 'id name',
              loadFields: { individual: 'name' }
            },
            address: '-id'
          })
      ).to.deep.equal([
        {
          association: 'employees',
          attributes: ['id', 'name'],
          duplicating: false,
          include: [
              {
                association: 'individual',
                attributes: ['name'],
                duplicating: false
              }
          ]
        }, {
          association: 'address',
          attributes: { exclude: ['id'] },
          duplicating: false
        }
      ]);
    });

  });

  describe('cascadeFieldsToInclude', () => {

    let model;
    before(() => model = new SequelizeCrudModel());

    it('Flat', () => {
      expect(
          model.cascadeFieldsToInclude([
            { field: 'employees' },
            'individual'
          ])
      ).to.deep.equal([
        { association: 'employees' },
        'individual'
      ]);
    });

    it('One level nested', () => {
      expect(
          model.cascadeFieldsToInclude([
            { field: 'employees', cascadeFields: ['address'] },
            'individual'
          ])
      ).to.deep.equal([
        { association: 'employees', include: ['address'] },
        'individual'
      ]);
    });

    it('Deep nested', () => {
      expect(
          model.cascadeFieldsToInclude([{
            field: 'employees',
            cascadeFields: [{
              field: 'address',
              cascadeFields: ['city']
            }]
          }])
      ).to.deep.equal([{
        association: 'employees',
        include: [{
          association: 'address',
          include: ['city']
        }]
      }
      ]);
    });

  });

  describe('getAll', () => {

    it('Include with projection', async () => {
      const stubModel = new StubModel();
      const model = new SequelizeCrudModel(stubModel);
      model.readInclude = ['address', 'individual'];
      await model.execGetAll({
        projection: { exclusive: false, paths: ['id', 'name', 'address.presentation'] }
      });
      expect(stubModel.findAll).to.have.been.calledWith({
        attributes: ["id", "name", 'address.presentation'],
        limit: 20,
        offset: 0,
        include: ['address']
      });
    });

  });

});