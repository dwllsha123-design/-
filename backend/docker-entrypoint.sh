#!/bin/sh
set -e
mkdir -p /data /app/uploads/products /app/uploads/banners
npx prisma migrate deploy
if [ "${ALLOW_SEED:-}" = "true" ]; then
  echo "Running database seed..."
  npx ts-node --transpile-only prisma/seed.ts
fi
exec node dist/main.js
