const { connectDb } = require('../config/db');
const { seedProducts } = require('./seedProducts');
const { seedUsers } = require('./seedUsers');

async function run() {
  await connectDb();
  await seedUsers();
  await seedProducts();
  // eslint-disable-next-line no-console
  console.log('Seeded products');
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
