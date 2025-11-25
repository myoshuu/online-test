#!/bin/sh
set -e

echo "Running Prisma migrations..."
bunx prisma migrate deploy

echo "Running Prisma seed..."
bunx tsx prisma/seed.ts || echo "No seed file found."

echo "Starting server..."
exec "$@"
