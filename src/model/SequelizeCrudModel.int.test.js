import { expect } from 'chai';
import Sequelize from 'sequelize';
import SequelizeCrudModel from './SequelizeCrudModel';

describe('Sequelize crud model', () => {

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
    await Department.sync({ force: true });
    await Address.sync({ force: true });
    await Employee.sync({ force: true });
  });

  const populateDatabase = async (depCount, employeeCount) => {
    const now = new Date();
    let empId = 0;
    for (let depId = 0; depId < depCount; depId++) {
      const employees = [];
      for (let i = 0; i < employeeCount; i++) {
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

    before(async() => await populateDatabase(3, 15));
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

      result = await model.execGetAll({ sort: { id: -1 } });
      expect(result[0].name).to.equal('Employee 44');
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

  describe('Count', () => {
    
    before(async() => await populateDatabase(1, 15));
    after(cleanDatabase);

    it('Count', async () => {
      const model = new SequelizeCrudModel(Employee);
      let result = await model.execCount();
      expect(result).to.equal(15);
      result = await model.execCount({ name: 'Employee 1' });
      expect(result).to.equal(1);
    });

  });

  it('Add one', async () => {
    const model = new SequelizeCrudModel(Department);
    let result = await model.execAddOne({ name: 'Department' });
    expect(result).to.be.ok;
    expect(result.name).to.equal('Department');
  });

  describe('Update', () => {

    before(async() => await populateDatabase(1, 5));
    after(cleanDatabase);

    it('Update', async () => {
      const model = new SequelizeCrudModel(Employee);
                                            // filter                 // payload
      let result = await model.execUpdateOne({ name: 'Employee 1' }, { name: 'Employee 11' });
      expect(result.name).to.equal('Employee 11');

      result = await model.execUpdateOne({ name: 'Employee 11111' }, { name: 'Employee 11' });
      expect(result).not.to.be.ok;
    });

  });

  describe('Delete', () => {

    before(async() => await populateDatabase(1, 1));
    after(cleanDatabase);

    it('Delete', async () => {
      const model = new SequelizeCrudModel(Department);
      await Department.create({ name: 'Test' });
      let result = await model.execDeleteOne({ name: 'Test' });
      expect(result).to.be.ok;
      result = await model.execDeleteOne({ name: 'Test' });
      expect(result).not.to.be.ok;
    });

  });

});