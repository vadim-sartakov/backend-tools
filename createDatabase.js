const { Client } = require('pg');

const defaultDb = process.env.POSTGRES_URL + '/postgres';
const client = new Client({ connectionString: defaultDb });

console.log('Creating database');

client.connect().then(() => {

  console.log('Connected to ' + defaultDb);

  client.query(`CREATE DATABASE ${process.env.POSTGRES_DB}`).then(() => {
    console.log(`Database ${process.env.POSTGRES_DB} created`);
    client.end();
  }).catch(error => {
    if (!error.message.includes('already exists')) {
      console.log(error);
    } else {
      console.log(`Database ${process.env.POSTGRES_DB} already exists`);
    }
    client.end();
  });
});