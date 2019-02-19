import { expect } from 'chai';
import SequelizeCrudModel from './SequelizeCrudModel';

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

});