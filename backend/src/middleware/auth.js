const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/errors');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized());
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.user_id, email: payload.email };
    return next();
  } catch (_err) {
    return next(unauthorized());
  }
}

module.exports = authMiddleware;
