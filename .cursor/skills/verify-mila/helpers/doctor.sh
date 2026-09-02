#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
TMP_DIR="/tmp/verify-mila"
PID_FILE="$TMP_DIR/dev-server.pid"
LOG_FILE="$TMP_DIR/doctor.log"

mkdir -p "$TMP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Running health checks..."

# Load .env.local if it exists
if [[ -f "$WORKSPACE_ROOT/.env.local" ]]; then
  set -a
  source "$WORKSPACE_ROOT/.env.local"
  set +a
fi

FAILED=0

# Check 1: Dev server process
if [[ ! -f "$PID_FILE" ]]; then
  echo "✗ Dev server PID file missing: $PID_FILE"
  FAILED=1
else
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "✓ Dev server running (PID $PID)"
  else
    echo "✗ Dev server process not running (stale PID $PID)"
    FAILED=1
  fi
fi

# Check 2: Port 3010 responsive
if command -v curl >/dev/null 2>&1; then
  if curl -sf http://localhost:3010 >/dev/null; then
    echo "✓ Port 3010 responsive"
  else
    echo "✗ Port 3010 not responding"
    FAILED=1
  fi
else
  echo "⚠ curl not available, skipping HTTP check"
fi

# Check 3: Environment variables
if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
  echo "✓ NEXT_PUBLIC_SUPABASE_URL set"
else
  echo "✗ NEXT_PUBLIC_SUPABASE_URL not set"
  FAILED=1
fi

if [[ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  echo "✓ NEXT_PUBLIC_SUPABASE_ANON_KEY set"
else
  echo "✗ NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
  FAILED=1
fi

# Check 4: Playwright installed
if [[ -f "$SCRIPT_DIR/node_modules/.bin/playwright" ]]; then
  echo "✓ Playwright installed"
else
  echo "✗ Playwright not installed (run install-playwright.sh)"
  FAILED=1
fi

if [[ $FAILED -eq 0 ]]; then
  echo ""
  echo "✓ All checks passed"
  exit 0
else
  echo ""
  echo "✗ Some checks failed"
  exit 1
fi
