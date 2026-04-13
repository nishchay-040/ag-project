const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { validateRegister, validateLogin } = require('../validators');
const { validationError, unauthorized, HttpError } = require('../utils/errors');

const BCRYPT_COST = 12;

function signToken(user) {
  return jwt.sign(
    { user_id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function register(req, res, next) {
  try {
    const fields = validateRegister(req.body);
    if (Object.keys(fields).length) throw validationError(fields);

    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const hash = await bcrypt.hash(password, BCRYPT_COST);

    let result;
    try {
      result = await pool.query(
        `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [name.trim(), normalizedEmail, hash]
      );
    } catch (err) {
      if (err.code === '23505') {
        throw new HttpError(400, { error: 'validation failed', fields: { email: 'already registered' } });
      }
      throw err;
    }

    const user = result.rows[0];
    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const fields = validateLogin(req.body);
    if (Object.keys(fields).length) throw validationError(fields);

    const { email, password } = req.body;
    const result = await pool.query(
      `SELECT id, name, email, password FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];
    if (!user) throw unauthorized();

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw unauthorized();

    const token = signToken(user);
    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login };
