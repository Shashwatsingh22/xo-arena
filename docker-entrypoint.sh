#!/bin/sh
set -e

DB_ADDR="${DATABASE_ADDR:-postgres:localdb@localhost:5432/nakama}"

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Starting Nakama..."
exec /nakama/nakama \
  --name xo-arena \
  --database.address "$DB_ADDR" \
  --logger.level INFO \
  --session.token_expiry_sec 7200 \
  --runtime.js_entrypoint "build/main.js" \
  --socket.server_key defaultkey
