const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI);
}

module.exports = { connectDb };
