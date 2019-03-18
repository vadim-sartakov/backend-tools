import { expect } from 'chai';
import mongoose, { Schema } from 'mongoose';
import deepFindPlugin from './deepFind';

mongoose.set('debug', true);

const managerSchema = new Schema({ name: String });
const manufacturerSchema = new Schema({ name: String });
const productSchema = new Schema({
  name: String, manufacturer: { type: Schema.Types.ObjectId, ref: 'Manufacturer' }, manager: [{ type: Schema.Types.ObjectId, ref: 'Manager' }]
});
const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number
});

const orderSchema = new Schema({
  number: Number,
  manufacturer: manufacturerSchema,
  manager: { type: Schema.Types.ObjectId, ref: 'Manager' },
  items: [orderItemSchema],
  comment: String
}, {
  searchFields: ['comment', 'manager.name', 'items.product.name'],
  maxDepth: true
});
orderSchema.plugin(deepFindPlugin);

describe.only('Mongoose deep find plugin', () => {

  let connection, Manager, Manufacturer, Product, Order;

  const populateDatabase = async () => {
    
    const john = await new Manager({ name: 'John' });
    const rebecca = await new Manager({ name: 'Rebecca' });
    
    const intel = await new Manufacturer({ name: 'Intel' }).save();
    const amd = await new Manufacturer({ name: 'AMD' }).save();

    const coreI5 = await new Product({ name: 'Core i5', manufacturer: intel }).save();
    const coreI7 = await new Product({ name: 'Core i7', manufacturer: intel }).save();

    const phenom = await new Product({ name: 'Phenom', manufacturer: amd }).save();
    const ryzen = await new Product({ name: 'Ryzen', manufacturer: amd }).save();

    await new Order({
      number: 1,
      manager: john,
      items: [
        { product: coreI5, quantity: 5 },
        { product: coreI7, quantity: 3 }
      ],
      comment: "Intel purchase"
    }).save();

    await new Order({
      number: 2,
      manager: rebecca,
      items: [
        { product: phenom, quantity: 1 },
        { product: ryzen, quantity: 2 }
      ],
      comment: "Amd purchase"
    }).save();

    await new Order({
      number: 3,
      manager: rebecca,
      items: [
        { product: ryzen, quantity: 2 },
        { product: coreI5, quantity: 5 },
        { product: phenom, quantity: 1 },
        { product: coreI7, quantity: 3 }
      ],
      comment: "Mixed purchase"
    }).save();

  };

  before(async () => {
    connection = await mongoose.createConnection(process.env.MONGO_DB_URL, { useNewUrlParser: true });
    Manager = connection.model('Manager', managerSchema);
    Manufacturer = connection.model('Manufacturer', manufacturerSchema);
    Product = connection.model('Product', productSchema);
    Order = connection.model('Order', orderSchema);
    await populateDatabase();
  });

  after(async () => {
    await connection.dropDatabase();
    await connection.close(true);
  });

  it.only('Loads whole tree with default depth when no options specified', async () => {
    const result = await Order.deepFindAll();
    expect(result).to.be.ok;
    expect(result.length).to.equal(3);
    //console.log("%o", result);
  });

  it('Skip 1 limit 1', async () => {
    const result = await Order.deepFindAll({ skip: 1, limit: 1 });
    expect(result).to.be.ok;
    expect(result.length).to.equal(1);
  });

  it('Search', async () => {
    const result = await Order.deepFindAll({ search: 'i5' });
    expect(result).to.be.ok;
    expect(result.length).to.equal(2);
  });

});