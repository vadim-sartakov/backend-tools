import { expect } from 'chai';
import SequelizeCrudModel from './SequelizeCrudModel';

describe('Sequelize crud model', () => {

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