const logger = require('../utils/logger');
const { HttpError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json(err.body);
  }
  logger.error({ err }, 'unhandled error');
  return res.status(500).json({ error: 'internal server error' });
}

module.exports = errorHandler;
