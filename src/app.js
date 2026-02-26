const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { CLIENT_ORIGIN } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { maintenanceMiddleware } = require('./middleware/maintenance');
const { healthRouter } = require('./routes/health');
const { authRouter } = require('./routes/auth');
const { productsRouter } = require('./routes/products');
const { meRouter } = require('./routes/me');
const { uploadsRouter } = require('./routes/uploads');
const { cartRouter } = require('./routes/cart');
const { wishlistRouter } = require('./routes/wishlist');
const { ordersRouter } = require('./routes/orders');
const { analyticsRouter } = require('./routes/analytics');
const { superadminRouter } = require('./routes/superadmin');
const { reportsRouter } = require('./routes/reports');
const { customerRouter } = require('./routes/customer');

const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
);

app.use(maintenanceMiddleware);

app.get('/', (req, res) => {
  res.json({ success: true, name: 'TrendKart API' });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/products', productsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/superadmin', superadminRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/customer', customerRouter);

app.use(errorHandler);

module.exports = { app };
