#!/usr/bin/env bash
# =============================================================================
# verify-runtimes.sh - CI integrity check for bundled runtime files
#
# Recomputes SHA-256 hashes of the committed runtime files in
# apps/web/public/runtimes/ and fails if any mismatch is detected.
#
# Run in CI after checkout (no network access needed - checks committed files).
# =============================================================================
set -euo pipefail

RUNTIMES="$(dirname "$0")/../apps/web/public/runtimes"
FAILED=0

check_file() {
  local path="$1"
  local expected="$2"
  local label="$3"
  if [[ ! -f "$path" ]]; then
    echo "MISSING: ${label}"
    FAILED=1
    return
  fi
  local actual
  actual=$(sha256sum "$path" | cut -d' ' -f1)
  if [[ "$actual" == "$expected" ]]; then
    echo "OK: ${label}"
  else
    echo "MISMATCH: ${label}"
    echo "  expected: ${expected}"
    echo "  actual:   ${actual}"
    FAILED=1
  fi
}

# ── Pyodide 0.27.5 ────────────────────────────────────────────────────────────
# Update when PYODIDE_VERSION changes in download-runtimes.sh
PYODIDE="${RUNTIMES}/pyodide"
check_file "${PYODIDE}/pyodide.js"          "7fdbe66e53f68f6a4e93c295a667371759be093d2bd402bb44545514584039b6" "pyodide/pyodide.js"
check_file "${PYODIDE}/pyodide.asm.js"      "3a889f073e628c2196c705b42fa0e955ba2e25c034b1e3dd589c35be675bc01b" "pyodide/pyodide.asm.js"
check_file "${PYODIDE}/pyodide.asm.wasm"    "f7fefe563134714a17abd65516d94960e8dbd96fe6778a7a842947fc9686b3a1" "pyodide/pyodide.asm.wasm"
check_file "${PYODIDE}/pyodide-lock.json"   "be1807745da93daa09d360b109c17a0e526e74d664d1f1b9870aafcce98ce426" "pyodide/pyodide-lock.json"
check_file "${PYODIDE}/python_stdlib.zip"   "6030964967e447c887abc46c5f0967c55688644d759496de82a3ef09f49f5cba" "pyodide/python_stdlib.zip"

# ── JSCPP 2.0.9 (browser IIFE bundle) ────────────────────────────────────────
# Rebuild with: bash scripts/build-jscpp/build.sh
JSCPP="${RUNTIMES}/jscpp"
check_file "${JSCPP}/bundle.js"             "326e3d3c6aef358db734f8d8a1b053e13054d339ca694663d637a603b16d6d07" "jscpp/bundle.js"

# ── v86 0.5.462 + Buildroot Linux (the real terminal of the Linux lessons) ────
# Update with download-runtimes.sh (V86_VERSION, V86_BIOS_COMMIT, image)
V86="${RUNTIMES}/v86"
check_file "${V86}/libv86.js"                "8715206b8c5ab0a206f6e8913c5f705a15547df51d3e0c032e3d00439303c94c" "v86/libv86.js"
check_file "${V86}/v86.wasm"                 "aa0d0e149d6b60063b85de4871e78505637ce92821e14a9f9802c4008ba2336e" "v86/v86.wasm"
check_file "${V86}/seabios.bin"              "73e3f359102e3a9982c35fce98eb7cd08f18303ac7f1ba6ebfbe6cdc1c244d98" "v86/seabios.bin"
check_file "${V86}/vgabios.bin"              "a4bc0d80cc3ca028c73dafa8fee396b8d054ce87ebd8abfbd31b06b437607880" "v86/vgabios.bin"
check_file "${V86}/buildroot-bzimage68.bin"  "507a759c70ab7a490a233be454d0b5b88bc667956a410b531cb4edc091e2eb1c" "v86/buildroot-bzimage68.bin"
# Debian's static bash (bash-static 5.2.15-2+b13, i386), copied to /bin/bash at boot
check_file "${V86}/bash"                     "eb5062d5e2fa6437dc7e7b5623879c3cdec34499c68d445ad6c9295390e93898" "v86/bash"

# ─────────────────────────────────────────────────────────────────────────────
if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "Runtime integrity check FAILED - files may have been tampered with or are outdated."
  exit 1
fi

echo "All runtime integrity checks passed."
