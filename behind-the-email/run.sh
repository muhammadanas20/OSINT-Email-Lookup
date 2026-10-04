#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d "node_modules/express" ]; then
  echo "Installing deps..."
  npm install --silent
fi
exec node server.js
