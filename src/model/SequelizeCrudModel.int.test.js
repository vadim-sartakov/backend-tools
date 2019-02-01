import { expect } from 'chai';
import Sequelize from 'sequelize';
import SequelizeCrudModel from './SequelizeCrudModel';

describe.only('Sequelize crud model', () => {

  const sequelize = new Sequelize(process.env.POSTGRES_DB_URL);

  const Address = sequelize.define('address', {
    address: { type: Sequelize.TEXT, allowNull: false }
  });

  const Department = sequelize.define('department', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING, allowNull: false, unique: true }
  });

  const Employee = sequelize.define('employee', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING, allowNull: false },
    birthdate: { type: Sequelize.DATE, allowNull: false }
  });

  Department.hasOne(Address);
  Department.hasMany(Employee);

  before(async () => {
    await Department.sync();
    await Address.sync();
    await Employee.sync();
  });

  const populateDatabase = async () => {
    const now = new Date();
    let empId = 0;
    for (let depId = 0; depId < 3; depId++) {
      const employees = [];
      for (let i = 0; i < 15; i++) {
        employees.push({
          name: 'Employee ' + (empId ++),
          birthdate: new Date(now.getFullYear() - 30, now.getMonth(), now.getDay())
        });
      }
      await Department.create({
        name: 'Department ' + depId,
        address: { address: 'Address ' + depId },
        employees
      }, { include: [ Address, Employee ] });
    }
  };

  const cleanDatabase = async () => {
    await Address.destroy({ where: {} });
    await Employee.destroy({ where: {} });
    await Department.destroy({ where: {} });
  };

  describe('Get all', () => {

    before(populateDatabase);
    after(cleanDatabase);

    it('Paging', async () => {
      const model = new SequelizeCrudModel(Employee);
      let result = await model.execGetAll({ page: 0, size: 20 });
      expect(result.length).to.equal(20);    
      result = await model.execGetAll({ page: 2, size: 20 });
      expect(result.length).to.equal(5);
    });

    it('Projection', async () => {
      const model = new SequelizeCrudModel(Employee);
      let result = await model.execGetAll({ projection: 'id' });
      expect(result[0].id).to.be.ok;
      expect(result[0].name).not.to.be.ok;
      expect(result[0].birthdate).not.to.be.ok;

      result = await model.execGetAll({ projection: 'id name' });
      expect(result[0].id).to.be.ok;
      expect(result[0].name).to.be.ok;
      expect(result[0].birthdate).not.to.be.ok;

      result = await model.execGetAll({ projection: '-id' });
      expect(result[0].id).not.to.be.ok;
      expect(result[0].name).to.be.ok;
      expect(result[0].birthdate).to.be.ok;

      result = await model.execGetAll({ projection: '-id -name' });
      expect(result[0].id).not.to.be.ok;
      expect(result[0].name).not.to.be.ok;
      expect(result[0].birthdate).to.be.ok;

    });

    it('Filtering', async () => {
      const model = new SequelizeCrudModel(Employee);
      let result = await model.execGetAll({ filter: { name: 'Employee 1' } });
      expect(result.length).to.equal(1);
      result = await model.execGetAll({ filter: { $or: [{ name: 'Employee 1' }, { name: 'Employee 2' }] } });
      expect(result.length).to.equal(2);
    });

    it('Sorting', async () => {
      const model = new SequelizeCrudModel(Employee);
      let result = await model.execGetAll({ sort: { id: 1 } });
      expect(result[0].name).to.equal('Employee 0');
      expect(result[result.length - 1].name).to.equal('Employee 19');

      result = await model.execGetAll({ sort: { id: -1 } });
      expect(result[0].name).to.equal('Employee 44');
      expect(result[result.length - 1].name).to.equal('Employee 25');
    });

    it('Search', async () => {
      const model = new SequelizeCrudModel(Department, {
        include: [{
          model: Employee,
          attributes: ['id', 'name'],
          // Without this option, malformed query produced
          duplicating: false
        }], searchFields: ['department.name', 'employees.name']
      });
      let result = await model.getAll({ filter: { search: 'ployee 42' } });
      expect(result.length).to.equal(1);
      expect(result[0].name).to.equal('Department 2');
      expect(result[0].employees.length).to.equal(1);
      expect(result[0].employees[0].name).to.equal('Employee 42');

      expect(result[0].employees[0].birthdate).not.to.be.ok;

      result = await model.getAll({ filter: { search: 'partment 2' } });
      expect(result.length).to.equal(1);
      expect(result[0].name).to.equal('Department 2');
      expect(result[0].employees.length).to.equal(15);
    });

  });

});