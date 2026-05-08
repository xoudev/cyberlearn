#!/usr/bin/env bash
# =============================================================================
# download-runtimes.sh — Download and verify Pyodide runtime files
#
# Run this script whenever you upgrade Pyodide or need to (re)populate
# apps/web/public/runtimes/pyodide/ from scratch.
#
# After downloading, re-run verify-runtimes.sh to confirm integrity.
# Update RUNTIMES_VERSIONS.md and the hashes in verify-runtimes.sh if you
# bump the version.
#
# Usage:
#   bash scripts/download-runtimes.sh
# =============================================================================
set -euo pipefail

PYODIDE_VERSION="0.27.5"
BASE_URL="https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full"
DEST="$(dirname "$0")/../apps/web/public/runtimes/pyodide"

# Expected SHA-256 hashes for Pyodide 0.27.5 minimal boot set.
# Update these hashes whenever PYODIDE_VERSION changes — run sha256sum on
# each file after download, then paste the output here and rerun verify.
declare -A EXPECTED_HASHES=(
  [pyodide.js]="7fdbe66e53f68f6a4e93c295a667371759be093d2bd402bb44545514584039b6"
  [pyodide-lock.json]="be1807745da93daa09d360b109c17a0e526e74d664d1f1b9870aafcce98ce426"
  [python_stdlib.zip]="6030964967e447c887abc46c5f0967c55688644d759496de82a3ef09f49f5cba"
  [pyodide.asm.wasm]="f7fefe563134714a17abd65516d94960e8dbd96fe6778a7a842947fc9686b3a1"
)

FILES=(pyodide.js pyodide-lock.json python_stdlib.zip pyodide.asm.wasm)

mkdir -p "$DEST"

echo "=== Downloading Pyodide ${PYODIDE_VERSION} ==="
for file in "${FILES[@]}"; do
  url="${BASE_URL}/${file}"
  dest_path="${DEST}/${file}"
  echo "  → ${file}"
  curl -fsSL --progress-bar "$url" -o "$dest_path"
done

echo ""
echo "=== Verifying SHA-256 ==="
FAILED=0
for file in "${FILES[@]}"; do
  actual=$(sha256sum "${DEST}/${file}" | cut -d' ' -f1)
  expected="${EXPECTED_HASHES[$file]}"
  if [[ "$actual" == "$expected" ]]; then
    echo "  ✓ ${file}"
  else
    echo "  ✗ ${file}"
    echo "    expected: ${expected}"
    echo "    actual:   ${actual}"
    FAILED=1
  fi
done

if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "INTEGRITY CHECK FAILED — do not use these files"
  exit 1
fi

echo ""
echo "All files verified. Pyodide ${PYODIDE_VERSION} ready in ${DEST}"
