require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');

const logger = require('./utils/logger');
const pool = require('./db/pool');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

function requireEnv(name) {
  if (!process.env[name]) {
    logger.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}
['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'].forEach(requireEnv);

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/projects', authMiddleware, projectRoutes);
app.use('/tasks', authMiddleware, taskRoutes);
app.use('/users', authMiddleware, userRoutes);

app.use((req, res) => res.status(404).json({ error: 'not found' }));
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '4000', 10);
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`TaskFlow API listening on :${PORT}`);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    try {
      await pool.end();
      logger.info('closed DB pool, bye');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  });
  setTimeout(() => {
    logger.error('forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
