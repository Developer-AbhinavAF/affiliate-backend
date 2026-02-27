const { app } = require('./app');
const { connectDb } = require('./config/db');
const { PORT } = require('./config/env');
const http = require('http');
const { Server } = require('socket.io');
const { configureCloudinary } = require('./config/cloudinary');

function runStartupProgressBar(durationMs = 6000) {
  const width = 24;
  const start = Date.now();

  return new Promise((resolve) => {
    const t = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(1, elapsed / durationMs);
      const filled = Math.round(pct * width);
      const bar = `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}`;
      const label = String(Math.round(pct * 100)).padStart(3, ' ');

      process.stdout.write(`\rStarting ${label}% [${bar}]`);

      if (pct >= 1) {
        clearInterval(t);
        process.stdout.write('\n');
        resolve();
      }
    }, 120);
  });
}

async function start() {
  const init = (async () => {
    await connectDb();
    configureCloudinary();
  })();

  await Promise.all([runStartupProgressBar(6000), init]);

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
