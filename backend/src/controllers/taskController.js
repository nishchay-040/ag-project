const pool = require('../db/pool');
const { validateTaskCreate, validateTaskUpdate, STATUSES, UUID_RE } = require('../validators');
const { validationError, notFound, forbidden } = require('../utils/errors');

const TASK_COLUMNS = `id, title, description, status, priority, project_id,
                      assignee_id, created_by, due_date, created_at, updated_at`;

async function listForProject(req, res, next) {
  try {
    const { id: projectId } = req.params;
    if (!UUID_RE.test(projectId)) throw notFound();

    const projectRes = await pool.query(`SELECT owner_id FROM projects WHERE id = $1`, [projectId]);
    const project = projectRes.rows[0];
    if (!project) throw notFound();

    // Access check
    const accessRes = await pool.query(
      `SELECT 1 FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.id = $1 AND (p.owner_id = $2 OR t.assignee_id = $2)
        LIMIT 1`,
      [projectId, req.user.id]
    );
    if (!accessRes.rows.length) throw forbidden();

    const { status, assignee } = req.query;
    const fields = {};
    if (status !== undefined && !STATUSES.includes(status)) {
      fields.status = `must be one of ${STATUSES.join(', ')}`;
    }
    if (assignee !== undefined && assignee !== '' && !UUID_RE.test(assignee)) {
      fields.assignee = 'must be a valid uuid';
    }
    if (Object.keys(fields).length) throw validationError(fields);

    const conditions = ['project_id = $1'];
    const values = [projectId];
    let i = 2;
    if (status) { conditions.push(`status = $${i++}`); values.push(status); }
    if (assignee) { conditions.push(`assignee_id = $${i++}`); values.push(assignee); }

    const result = await pool.query(
      `SELECT ${TASK_COLUMNS} FROM tasks
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at ASC`,
      values
    );
    return res.json({ tasks: result.rows });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const { id: projectId } = req.params;
    if (!UUID_RE.test(projectId)) throw notFound();

    const fields = validateTaskCreate(req.body);
    if (Object.keys(fields).length) throw validationError(fields);

    const projectRes = await pool.query(`SELECT owner_id FROM projects WHERE id = $1`, [projectId]);
    const project = projectRes.rows[0];
    if (!project) throw notFound();

    // Access: owner or existing assignee on the project
    const accessRes = await pool.query(
      `SELECT 1 FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.id = $1 AND (p.owner_id = $2 OR t.assignee_id = $2)
        LIMIT 1`,
      [projectId, req.user.id]
    );
    if (!accessRes.rows.length) throw forbidden();

    if (req.body.assignee_id) {
      const u = await pool.query(`SELECT 1 FROM users WHERE id = $1`, [req.body.assignee_id]);
      if (!u.rows.length) throw validationError({ assignee_id: 'user not found' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${TASK_COLUMNS}`,
      [
        req.body.title.trim(),
        req.body.description || null,
        req.body.status || 'todo',
        req.body.priority || 'medium',
        projectId,
        req.body.assignee_id || null,
        req.user.id,
        req.body.due_date || null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw notFound();

    const fields = validateTaskUpdate(req.body);
    if (Object.keys(fields).length) throw validationError(fields);

    const taskRes = await pool.query(
      `SELECT t.*, p.owner_id AS project_owner_id
         FROM tasks t JOIN projects p ON p.id = t.project_id
        WHERE t.id = $1`,
      [id]
    );
    const task = taskRes.rows[0];
    if (!task) throw notFound();

    const isOwner = task.project_owner_id === req.user.id;
    const isCreator = task.created_by === req.user.id;
    const isAssignee = task.assignee_id === req.user.id;
    if (!isOwner && !isCreator && !isAssignee) throw forbidden();

    if (req.body.assignee_id) {
      const u = await pool.query(`SELECT 1 FROM users WHERE id = $1`, [req.body.assignee_id]);
      if (!u.rows.length) throw validationError({ assignee_id: 'user not found' });
    }

    const sets = [];
    const values = [];
    let i = 1;
    for (const key of ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date']) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = $${i++}`);
        values.push(
          key === 'title' && typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key]
        );
      }
    }
    if (!sets.length) {
      const r = await pool.query(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = $1`, [id]);
      return res.json(r.rows[0]);
    }
    sets.push(`updated_at = NOW()`);
    values.push(id);
    const result = await pool.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING ${TASK_COLUMNS}`,
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

    const taskRes = await pool.query(
      `SELECT t.created_by, p.owner_id AS project_owner_id
         FROM tasks t JOIN projects p ON p.id = t.project_id
        WHERE t.id = $1`,
      [id]
    );
    const task = taskRes.rows[0];
    if (!task) throw notFound();

    const isOwner = task.project_owner_id === req.user.id;
    const isCreator = task.created_by === req.user.id;
    if (!isOwner && !isCreator) throw forbidden();

    await pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listForProject, create, update, remove };
