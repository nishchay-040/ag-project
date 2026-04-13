const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateRegister(body) {
  const fields = {};
  if (!body || typeof body.name !== 'string' || !body.name.trim()) fields.name = 'is required';
  if (!body || typeof body.email !== 'string' || !body.email.trim()) fields.email = 'is required';
  else if (!EMAIL_RE.test(body.email)) fields.email = 'is invalid';
  if (!body || typeof body.password !== 'string' || body.password.length < 8) {
    fields.password = 'must be at least 8 characters';
  }
  return fields;
}

function validateLogin(body) {
  const fields = {};
  if (!body || typeof body.email !== 'string' || !body.email.trim()) fields.email = 'is required';
  if (!body || typeof body.password !== 'string' || !body.password) fields.password = 'is required';
  return fields;
}

function validateProjectCreate(body) {
  const fields = {};
  if (!body || typeof body.name !== 'string' || !body.name.trim()) fields.name = 'is required';
  if (body && body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    fields.description = 'must be a string';
  }
  return fields;
}

function validateProjectUpdate(body) {
  const fields = {};
  if (!body || typeof body !== 'object') {
    fields._ = 'invalid body';
    return fields;
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    fields.name = 'must be a non-empty string';
  }
  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    fields.description = 'must be a string';
  }
  return fields;
}

function validateTaskCreate(body) {
  const fields = {};
  if (!body || typeof body.title !== 'string' || !body.title.trim()) fields.title = 'is required';
  if (body && body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    fields.description = 'must be a string';
  }
  if (body && body.status !== undefined && !STATUSES.includes(body.status)) {
    fields.status = `must be one of ${STATUSES.join(', ')}`;
  }
  if (body && body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    fields.priority = `must be one of ${PRIORITIES.join(', ')}`;
  }
  if (body && body.assignee_id !== undefined && body.assignee_id !== null && !UUID_RE.test(body.assignee_id)) {
    fields.assignee_id = 'must be a valid uuid';
  }
  if (body && body.due_date !== undefined && body.due_date !== null && !DATE_RE.test(body.due_date)) {
    fields.due_date = 'must be YYYY-MM-DD';
  }
  return fields;
}

function validateTaskUpdate(body) {
  const fields = {};
  if (!body || typeof body !== 'object') {
    fields._ = 'invalid body';
    return fields;
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    fields.title = 'must be a non-empty string';
  }
  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    fields.description = 'must be a string';
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    fields.status = `must be one of ${STATUSES.join(', ')}`;
  }
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    fields.priority = `must be one of ${PRIORITIES.join(', ')}`;
  }
  if (body.assignee_id !== undefined && body.assignee_id !== null && !UUID_RE.test(body.assignee_id)) {
    fields.assignee_id = 'must be a valid uuid';
  }
  if (body.due_date !== undefined && body.due_date !== null && !DATE_RE.test(body.due_date)) {
    fields.due_date = 'must be YYYY-MM-DD';
  }
  return fields;
}

module.exports = {
  STATUSES,
  PRIORITIES,
  UUID_RE,
  validateRegister,
  validateLogin,
  validateProjectCreate,
  validateProjectUpdate,
  validateTaskCreate,
  validateTaskUpdate,
};
