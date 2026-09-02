#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
# Navigate up from .cursor/skills/verify-mila to workspace root
WORKSPACE_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
TMP_DIR="/tmp/verify-mila"
LOG_FILE="$TMP_DIR/launch.log"
PID_FILE="$TMP_DIR/dev-server.pid"
SERVER_LOG="$TMP_DIR/dev-server.log"

mkdir -p "$TMP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting dev server launch..."

# Check Node version
NODE_VERSION=$(node -v)
if [[ ! "$NODE_VERSION" =~ ^v22\. ]]; then
  echo "ERROR: Node 22.x required, found $NODE_VERSION"
  exit 1
fi
echo "✓ Node version: $NODE_VERSION"

# Verify package.json
if [[ ! -f "$WORKSPACE_ROOT/package.json" ]]; then
  echo "ERROR: package.json not found at $WORKSPACE_ROOT"
  exit 1
fi
echo "✓ package.json exists"

# Check if server already running
if [[ -f "$PID_FILE" ]]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "WARNING: Dev server already running (PID $OLD_PID)"
    echo "Run cleanup.sh first to stop it"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

cd "$WORKSPACE_ROOT"

echo "Starting npm run dev --port 3010..."
nohup npm run dev -- --port 3010 > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

echo "Dev server PID: $SERVER_PID"
echo "Waiting for server to be ready (max 60s)..."

# Wait for "Local:" or "Ready" in logs
TIMEOUT=60
ELAPSED=0
while [[ $ELAPSED -lt $TIMEOUT ]]; do
  if grep -q -E "Local:|Ready" "$SERVER_LOG" 2>/dev/null; then
    echo "✓ Dev server ready at http://localhost:3010"
    exit 0
  fi
  
  # Check if process died
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "ERROR: Dev server process died"
    echo "Last 20 lines of log:"
    tail -n 20 "$SERVER_LOG"
    exit 1
  fi
  
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

echo "ERROR: Timeout waiting for dev server"
echo "Last 20 lines of log:"
tail -n 20 "$SERVER_LOG"
exit 1
