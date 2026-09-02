#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_ROOT="$(cd "$SKILL_DIR/../.." && pwd)"
HELPERS_DIR="$SCRIPT_DIR"

echo "Installing Playwright locally under helpers/..."

cd "$HELPERS_DIR"

# Initialize package.json if it doesn't exist
if [[ ! -f package.json ]]; then
  cat > package.json <<'EOF'
{
  "name": "verify-mila-helpers",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "playwright": "^1.40.0"
  }
}
EOF
fi

npm install --silent

echo "Installing Chromium browser..."
npx playwright install chromium --with-deps

echo "✓ Playwright installed at $HELPERS_DIR/node_modules"
