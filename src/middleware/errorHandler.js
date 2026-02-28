function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err && err.name === 'ZodError') {
    status = 400;
    const first = Array.isArray(err.issues) ? err.issues[0] : null;
    message = first?.message || 'Invalid request payload';
  }

  if (err && err.name === 'ValidationError') {
    status = 400;
    const firstKey = err.errors ? Object.keys(err.errors)[0] : null;
    message = (firstKey && err.errors[firstKey]?.message) || 'Validation failed';
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
  });
}

module.exports = { errorHandler };
