#!/usr/bin/env bash
# =============================================================================
# verify-runtimes.sh — CI integrity check for bundled runtime files
#
# Recomputes SHA-256 hashes of the committed files in
# apps/web/public/runtimes/pyodide/ and fails if any mismatch is detected.
#
# Run in CI after checkout (no network access needed — checks committed files).
# =============================================================================
set -euo pipefail

DEST="$(dirname "$0")/../apps/web/public/runtimes/pyodide"

# Pyodide 0.27.5 — update when PYODIDE_VERSION changes in download-runtimes.sh
declare -A EXPECTED=(
  [pyodide.js]="7fdbe66e53f68f6a4e93c295a667371759be093d2bd402bb44545514584039b6"
  [pyodide-lock.json]="be1807745da93daa09d360b109c17a0e526e74d664d1f1b9870aafcce98ce426"
  [python_stdlib.zip]="6030964967e447c887abc46c5f0967c55688644d759496de82a3ef09f49f5cba"
  [pyodide.asm.wasm]="f7fefe563134714a17abd65516d94960e8dbd96fe6778a7a842947fc9686b3a1"
)

FAILED=0

for file in "${!EXPECTED[@]}"; do
  path="${DEST}/${file}"
  if [[ ! -f "$path" ]]; then
    echo "MISSING: ${file}"
    FAILED=1
    continue
  fi
  actual=$(sha256sum "$path" | cut -d' ' -f1)
  expected="${EXPECTED[$file]}"
  if [[ "$actual" == "$expected" ]]; then
    echo "OK: ${file}"
  else
    echo "MISMATCH: ${file}"
    echo "  expected: ${expected}"
    echo "  actual:   ${actual}"
    FAILED=1
  fi
done

if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "Runtime integrity check FAILED — files may have been tampered with or are outdated."
  exit 1
fi

echo "All runtime integrity checks passed."
