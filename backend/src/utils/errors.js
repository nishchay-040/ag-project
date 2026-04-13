class HttpError extends Error {
  constructor(status, body) {
    super(typeof body === 'string' ? body : body.error || 'error');
    this.status = status;
    this.body = typeof body === 'string' ? { error: body } : body;
  }
}

const validationError = (fields) => new HttpError(400, { error: 'validation failed', fields });
const unauthorized = () => new HttpError(401, { error: 'unauthorized' });
const forbidden = () => new HttpError(403, { error: 'forbidden' });
const notFound = () => new HttpError(404, { error: 'not found' });

module.exports = { HttpError, validationError, unauthorized, forbidden, notFound };
