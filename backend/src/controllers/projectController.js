const pool = require('../db/pool');
const { validateProjectCreate, validateProjectUpdate, UUID_RE } = require('../validators');
const { validationError, notFound, forbidden } = require('../utils/errors');

async function list(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at
         FROM projects p
         LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.owner_id = $1 OR t.assignee_id = $1
        ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    return res.json({ projects: result.rows });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const fields = validateProjectCreate(req.body);
    if (Object.keys(fields).length) throw validationError(fields);
    const { name, description } = req.body;
    const result = await pool.query(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, owner_id, created_at`,
      [name.trim(), description || null, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw notFound();

    const projectRes = await pool.query(
      `SELECT id, name, description, owner_id, created_at
         FROM projects WHERE id = $1`,
      [id]
    );
    const project = projectRes.rows[0];
    if (!project) throw notFound();

    // Access: owner or has any task assigned to them in the project
    const accessRes = await pool.query(
      `SELECT 1 FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.id = $1 AND (p.owner_id = $2 OR t.assignee_id = $2)
        LIMIT 1`,
      [id, req.user.id]
    );
    if (!accessRes.rows.length) throw forbidden();

    const tasksRes = await pool.query(
      `SELECT id, title, description, status, priority, project_id,
              assignee_id, due_date, created_at, updated_at
         FROM tasks WHERE project_id = $1
         ORDER BY created_at ASC`,
      [id]
    );

    return res.json({ ...project, tasks: tasksRes.rows });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw notFound();

    const fields = validateProjectUpdate(req.body);
    if (Object.keys(fields).length) throw validationError(fields);

    const projectRes = await pool.query(`SELECT owner_id FROM projects WHERE id = $1`, [id]);
    const project = projectRes.rows[0];
    if (!project) throw notFound();
    if (project.owner_id !== req.user.id) throw forbidden();

    const sets = [];
    const values = [];
    let i = 1;
    if (req.body.name !== undefined) { sets.push(`name = $${i++}`); values.push(req.body.name.trim()); }
    if (req.body.description !== undefined) { sets.push(`description = $${i++}`); values.push(req.body.description); }
    if (!sets.length) {
      const r = await pool.query(
        `SELECT id, name, description, owner_id, created_at FROM projects WHERE id = $1`, [id]
      );
      return res.json(r.rows[0]);
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, name, description, owner_id, created_at`,
      values
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw notFound();

    const projectRes = await pool.query(`SELECT owner_id FROM projects WHERE id = $1`, [id]);
    const project = projectRes.rows[0];
    if (!project) throw notFound();
    if (project.owner_id !== req.user.id) throw forbidden();

    await pool.query(`DELETE FROM projects WHERE id = $1`, [id]);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, getOne, update, remove };
