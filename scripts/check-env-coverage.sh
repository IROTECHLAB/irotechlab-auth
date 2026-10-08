#!/usr/bin/env bash
# Verifies that every process.env.X referenced in code is documented in .env.example.
set -euo pipefail

EXIT=0

# Extract every env var name referenced in source
# Process.env.X → X
USED=$(grep -rhoE 'process\.env\.[A-Z_][A-Z0-9_]*' src/ --include="*.ts" --include="*.tsx" 2>/dev/null \
  | sed 's/process\.env\.//' \
  | sort -u)

# Extract every env var name in .env.example
DOCUMENTED=$(grep -oE '^[A-Z_][A-Z0-9_]*=' .env.example 2>/dev/null \
  | tr -d '=' \
  | sort -u)

# System/Next.js vars we don't need to document
IGNORE="^NODE_ENV$\|^NEXT_RUNTIME$\|^VERCEL$\|^VERCEL_ENV$\|^CI$\|^NODE_OPTIONS$"

MISSING=$(comm -23 <(echo "$USED") <(echo "$DOCUMENTED") | grep -vE "$IGNORE" || true)

if [ -n "$MISSING" ]; then
  echo "❌ Env vars used in code but not in .env.example:"
  echo "$MISSING"
  EXIT=1
else
  echo "✅ All env vars are documented in .env.example"
fi

exit $EXIT
