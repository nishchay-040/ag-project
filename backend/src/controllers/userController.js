const pool = require('../db/pool');

// Used by the frontend assignee dropdown. Only returns id/name/email.
async function list(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, email FROM users ORDER BY name ASC`
    );
    return res.json({ users: result.rows });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, me };
