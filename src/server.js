const { app } = require('./app');
const { connectDb } = require('./config/db');
const { PORT } = require('./config/env');
const http = require('http');
const { Server } = require('socket.io');
const { configureCloudinary } = require('./config/cloudinary');

async function start() {
  await connectDb();
  configureCloudinary();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  app.set('io', io);

  io.on('connection', (socket) => {
    socket.on('auth', ({ userId }) => {
      if (userId) socket.join(`user:${userId}`);
    });
  });

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});
