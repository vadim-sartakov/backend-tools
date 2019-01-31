import Sequelize, { Op } from 'sequelize';

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
      for (let i = 0; i < 10; i++) {
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

    it('Get page 0, size 20', async () => {
      const result = await Department.findAll({
        where: {
          $or: [
            { "$department.name$": { $like: "%4%" } },
            { "$employees.name$": { $like: "%10%" } }
          ]
        },
        include: [Address, Employee]
      });
      console.log("%o", JSON.parse(JSON.stringify(result)));
    });

  });

});