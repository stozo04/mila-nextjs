#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="/tmp/verify-mila"
PID_FILE="$TMP_DIR/dev-server.pid"
LOG_FILE="$TMP_DIR/cleanup.log"

mkdir -p "$TMP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting cleanup..."

if [[ ! -f "$PID_FILE" ]]; then
  echo "No dev server PID file found, nothing to clean up"
  exit 0
fi

PID=$(cat "$PID_FILE")
echo "Found dev server PID: $PID"

if ! kill -0 "$PID" 2>/dev/null; then
  echo "Process $PID not running (already stopped)"
  rm -f "$PID_FILE"
  exit 0
fi

echo "Stopping process $PID..."
kill "$PID"

# Wait up to 10s for graceful shutdown
TIMEOUT=10
ELAPSED=0
while kill -0 "$PID" 2>/dev/null && [[ $ELAPSED -lt $TIMEOUT ]]; do
  sleep 1
  ((ELAPSED++))
done

if kill -0 "$PID" 2>/dev/null; then
  echo "Process didn't stop gracefully, force killing..."
  kill -9 "$PID" 2>/dev/null || true
  sleep 1
fi

if kill -0 "$PID" 2>/dev/null; then
  echo "ERROR: Failed to stop process $PID"
  exit 1
else
  echo "✓ Dev server stopped"
  rm -f "$PID_FILE"
fi

echo "Evidence preserved at $TMP_DIR/evidence/"
exit 0
