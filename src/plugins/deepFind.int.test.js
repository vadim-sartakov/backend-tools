import { expect } from 'chai';
import mongoose, { Schema, SchemaType } from 'mongoose';
import deepFindPlugin from './deepFind';

mongoose.set('debug', true);

const stockSchema = new Schema({ name: String });
const managerSchema = new Schema({ name: String });
const manufacturerSchema = new Schema({ name: String });
const specSchema = new Schema({ name: String });
const productSchema = new Schema({
  name: String,
  manufacturer: { type: Schema.Types.ObjectId, ref: 'Manufacturer' },
  specs: [
    {
      spec: { type: Schema.Types.ObjectId, ref: 'Spec' },
      value: String
    }
  ]
});
const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number
});

const orderSchema = new Schema({
  number: Number,
  invoice: {
    number: String
  },
  stock: stockSchema,
  manager: { type: Schema.Types.ObjectId, ref: 'Manager' },
  items: [orderItemSchema],
  comment: String
}, {
  searchFields: ['comment', 'manager.name', 'items.product.name'],
  maxDepth: true
});
orderSchema.plugin(deepFindPlugin);

describe.only('Mongoose deep find plugin', () => {

  let connection, Stock, Manager, Manufacturer, Spec, Product, Order;

  const populateDatabase = async () => {
    
    const primaryStock = await new Stock({ name: 'Primary' }).save();
    const secondaryStock = await new Stock({ name: 'Secondary' }).save();

    const john = await new Manager({ name: 'John' }).save();
    const rebecca = await new Manager({ name: 'Rebecca' }).save();
    
    const size = await new Spec({ name: 'size' }).save();
    const weight = await new Spec({ name: 'weight' }).save();

    const intel = await new Manufacturer({ name: 'Intel' }).save();
    const amd = await new Manufacturer({ name: 'AMD' }).save();

    const coreI5 = await new Product({
      name: 'Core i5',
      manufacturer: intel,
      specs: [
        { spec: size, value: '15x15' },
        { spec: weight, value: '200' }
      ]
    }).save();
    const coreI7 = await new Product({
      name: 'Core i7',
      manufacturer: intel,
      specs: [
        { spec: size, value: '12x12' },
        { spec: weight, value: '150' }
      ]
    }).save();

    const phenom = await new Product({
      name: 'Phenom',
      manufacturer: amd,
      specs: [
        { spec: size, value: '16x16' },
        { spec: weight, value: '220' }
      ]
    }).save();
    const ryzen = await new Product({
      name: 'Ryzen',
      manufacturer: amd,
      specs: [
        { spec: size, value: '10x10' },
        { spec: weight, value: '120' }
      ]
    }).save();

    await new Order({
      number: 1,
      invoice: { number: 1 },
      stock: primaryStock,
      manager: john,
      complex: { one: '1', two: '2' },
      items: [
        { product: coreI5, quantity: 5 },
        { product: coreI7, quantity: 3 }
      ],
      comment: "Intel purchase"
    }).save();

    /*await new Order({
      number: 2,
      invoice: { number: 2 },
      stock: secondaryStock,
      manager: rebecca,
      items: [
        { product: phenom, quantity: 1 },
        { product: ryzen, quantity: 2 }
      ],
      comment: "Amd purchase"
    }).save();

    await new Order({
      number: 3,
      stock: secondaryStock,
      invoice: { number: 3 },
      manager: rebecca,
      items: [
        { product: ryzen, quantity: 2 },
        { product: coreI5, quantity: 5 },
        { product: phenom, quantity: 1 },
        { product: coreI7, quantity: 3 }
      ],
      comment: "Mixed purchase"
    }).save();*/

  };

  before(async () => {
    connection = await mongoose.createConnection(process.env.MONGO_DB_URL, { useNewUrlParser: true });
    Stock = connection.model('Stock', stockSchema);
    Manager = connection.model('Manager', managerSchema);
    Manufacturer = connection.model('Manufacturer', manufacturerSchema);
    Spec = connection.model('Spec', specSchema);
    Product = connection.model('Product', productSchema);
    Order = connection.model('Order', orderSchema);
    await populateDatabase();
  });

  after(async () => {
    await connection.dropDatabase();
    await connection.close(true);
  });

  it.only('Loads whole tree with default depth when no options specified', async () => {
    const result = await Order.deepFind();
    expect(result).to.be.ok;
    //expect(result.length).to.equal(3);
    console.log(JSON.stringify(result, null, 4));
  });

  it('Skip 1 limit 1', async () => {
    const result = await Order.deepFind({ skip: 1, limit: 1 });
    expect(result).to.be.ok;
    expect(result.length).to.equal(1);
  });

  it('Search', async () => {
    const result = await Order.deepFind({ search: 'i5' });
    expect(result).to.be.ok;
    expect(result.length).to.equal(2);
  });

});