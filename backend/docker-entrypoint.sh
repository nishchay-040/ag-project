#!/bin/sh
set -e

echo "[entrypoint] Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
# Simple TCP wait loop (Alpine has nc by default via busybox)
for i in $(seq 1 60); do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "[entrypoint] Postgres is reachable"
    break
  fi
  sleep 1
  if [ "$i" = "60" ]; then
    echo "[entrypoint] Postgres did not become reachable in time"
    exit 1
  fi
done

export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "[entrypoint] Running migrations..."
./node_modules/.bin/node-pg-migrate up

echo "[entrypoint] Running seed..."
node seeds/seed.js || echo "[entrypoint] seed reported non-zero, continuing"

echo "[entrypoint] Starting app: $@"
exec "$@"
