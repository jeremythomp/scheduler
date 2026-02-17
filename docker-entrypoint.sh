#!/bin/sh
set -e

echo "Running Prisma migrations..."
# Only run migrate deploy if migrations directory exists
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
  npx prisma migrate deploy
else
  echo "No migrations found, skipping migrate deploy"
fi

echo "Starting Next.js server..."
exec node server.js
