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