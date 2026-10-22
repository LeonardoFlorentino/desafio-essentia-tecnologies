#!/bin/sh
# Container start: bring the schema up to date, create the demo user if asked to, then serve.
set -e

# No JWT_SECRET given: a random one for this run instead of a well-known default. Sessions
# simply end when the container restarts. A deploy should set its own secret.
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64'))")
  export JWT_SECRET
  echo "JWT_SECRET not set: using a random secret (sessions end when the container restarts)"
fi

node dist/db/migrate.js

# The demo account's password is public (README): only created when explicitly enabled.
if [ "$SEED_DEMO_USER" = "true" ]; then
  node dist/db/seed.js
fi

# exec: the API becomes PID 1 and receives the container's stop signal directly.
exec node dist/server.js
