#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=== 1. Installing Python Dependencies ==="
pip install -r backend/requirements.txt

echo "=== 2. Building React Frontend Assets ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Build Complete! Static assets ready in frontend/dist ==="
