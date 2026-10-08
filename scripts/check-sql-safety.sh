#!/usr/bin/env bash
# Fails if any dangerous SQL pattern is found in source.
# Safe usage: sql`SELECT * FROM users WHERE id = ${id}`
# Unsafe:     sql.unsafe(...), sql("..." + var), sql.query("..." + var)

set -euo pipefail

EXIT=0

check() {
  local label="$1"
  local pattern="$2"
  local matches
  matches=$(grep -rnE "$pattern" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "❌ $label"
    echo "$matches"
    EXIT=1
  else
    echo "✅ $label"
  fi
}

check "No sql.unsafe() calls"                 'sql\.unsafe\('
check "No sql.raw() calls"                    'sql\.raw\('
check "No sql.query() with interpolation"     'sql\.query\(.*\$\{'
check "No string concat in sql template"      'sql`[^`]*\$\{[^}]*\+'

# Allow sql.unsafe() in account-lockout.ts for interval constants — that's
# an intentional exception. Re-check that file separately.
if grep -n 'sql\.unsafe' src/lib/account-lockout.ts 2>/dev/null; then
  echo "⚠️  src/lib/account-lockout.ts uses sql.unsafe — verify it's only for constants"
  # Don't fail the build for this
fi

exit $EXIT
