/* Idempotent seed: creates a known test user, one project, and three tasks. */
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/db/pool');
const logger = require('../src/utils/logger');

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';
const TEST_NAME = 'Test User';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [TEST_EMAIL]);
    let userId;
    if (existing.rows.length) {
      userId = existing.rows[0].id;
      logger.info({ userId }, 'seed: test user already exists, skipping user create');
    } else {
      const hash = await bcrypt.hash(TEST_PASSWORD, 12);
      const u = await client.query(
        `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
        [TEST_NAME, TEST_EMAIL, hash]
      );
      userId = u.rows[0].id;
      logger.info({ userId }, 'seed: created test user');
    }

    const projRes = await client.query(
      `SELECT id FROM projects WHERE owner_id = $1 AND name = $2`,
      [userId, 'Website Redesign']
    );
    let projectId;
    if (projRes.rows.length) {
      projectId = projRes.rows[0].id;
      logger.info({ projectId }, 'seed: project already exists, skipping');
    } else {
      const p = await client.query(
        `INSERT INTO projects (name, description, owner_id)
         VALUES ($1, $2, $3) RETURNING id`,
        ['Website Redesign', 'Q2 marketing site refresh', userId]
      );
      projectId = p.rows[0].id;

      const tasks = [
        ['Design homepage hero', 'New hero with value prop copy', 'in_progress', 'high', '2026-04-20'],
        ['Wire up contact form', 'Hook form to backend API', 'todo', 'medium', '2026-04-25'],
        ['QA across breakpoints', 'Verify 375px and 1280px', 'done', 'low', '2026-04-10'],
      ];
      for (const [title, description, status, priority, due] of tasks) {
        await client.query(
          `INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [title, description, status, priority, projectId, userId, userId, due]
        );
      }
      logger.info({ projectId }, 'seed: created project + 3 tasks');
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'seed failed');
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
