#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="/tmp/verify-mila"
EVIDENCE_DIR="$TMP_DIR/evidence"
LOG_FILE="$TMP_DIR/drive.log"

mkdir -p "$EVIDENCE_DIR/screenshots" "$EVIDENCE_DIR/aria-snapshots" "$EVIDENCE_DIR/console-logs"
exec > >(tee -a "$LOG_FILE") 2>&1

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <feature-id>"
  echo "Available features: home, login, privacy-policy, blogs-list, journey-cards"
  exit 1
fi

FEATURE_ID="$1"
SPEC_FILE="$SCRIPT_DIR/${FEATURE_ID}.spec.ts"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Driving feature: $FEATURE_ID"

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "ERROR: Spec file not found: $SPEC_FILE"
  exit 1
fi

cd "$SCRIPT_DIR"
export EVIDENCE_DIR
export FEATURE_ID

npx playwright test --config=playwright.config.ts "$SPEC_FILE" --reporter=line

EXIT_CODE=$?
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✓ Feature verification passed: $FEATURE_ID"
else
  echo "✗ Feature verification failed: $FEATURE_ID"
fi

exit $EXIT_CODE
