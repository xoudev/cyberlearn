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
# Debian's compiled terminfo entry for TERM=linux (ncurses-base 6.4-4), for bash's line editor
check_file "${V86}/terminfo-linux"           "b70a4941416eb703a01b5a06fd1c914880452302b0e0b2a7dea12600607824a7" "v86/terminfo-linux"

# ── sql.js 1.14.2 (SQLite in WebAssembly, the SQL lessons' real database) ────
# Update with download-runtimes.sh (SQLJS_VERSION)
SQLJS="${RUNTIMES}/sqljs"
check_file "${SQLJS}/worker.sql-wasm.js"     "92a4031e278cdb20e5841296e0265b0e973f3190c30f2ec86fcb13bffa89ba5c" "sqljs/worker.sql-wasm.js"
check_file "${SQLJS}/sql-wasm.wasm"          "38c14f6e379210bc942bdc4ebca44e7bfdb4318ecc1c72ca666a28fdce96670a" "sqljs/sql-wasm.wasm"

# ── php-wasm 0.2.0 (PHP 8.4 in WebAssembly, the web labs' real server) ───────
# Update with download-runtimes.sh (PHP_WASM_VERSION)
PHP="${RUNTIMES}/php"
check_file "${PHP}/php8.4-web.mjs" "504312263241f39008f3ea1c9dd305c8984156eb31c163e9be560d8438cd9c7c" "php/php8.4-web.mjs"
check_file "${PHP}/6733ae879e026f8b36961884052b87de4def4e15.wasm" "7da04fb61f9be008c79eb1eee385dab5ed3d3702f7bed07dd65fd82ba3bf3729" "php/6733ae879e026f8b36961884052b87de4def4e15.wasm"
check_file "${PHP}/PhpBase.mjs" "2edb5379b4ebafe7e450021cd651cd92cb3022857d6be81de4a6e4f52fb96dc1" "php/PhpBase.mjs"
check_file "${PHP}/OutputBuffer.mjs" "fdf73a3e360c715bdc8f745b5aa148dbfdf2a9c5808c18cf2e422ecf97061785" "php/OutputBuffer.mjs"
check_file "${PHP}/_Event.mjs" "bbfd97aa6bfd6820733a2be211db73c8e7075ea5e2dbaa1ae29fba3d7a328d00" "php/_Event.mjs"
check_file "${PHP}/fsOps.mjs" "bcc046e37c3d6cf1d39756b47c7d0dc31eec1f9dd7c901e160735bcb9b21b501" "php/fsOps.mjs"
check_file "${PHP}/resolveDependencies.mjs" "f70c7f469d6d47ee268421e976e0f3e536f418f6b1bc8988b0c77d1c912ed08b" "php/resolveDependencies.mjs"
check_file "${PHP}/LICENSE-php-wasm.txt" "becde03a3c8b9b2e3d58c7b65ca7ffd9e18e98162396cc374052983c1faaa47c" "php/LICENSE-php-wasm.txt"
check_file "${PHP}/NOTICE-php-wasm.txt" "8bfd3338b7e408a48fa53f74a13a3bf71a553a70ada869c090e1a7d7070d32f8" "php/NOTICE-php-wasm.txt"
check_file "${PHP}/LICENSE-php.txt" "b42e4df5e50e6ecda1047d503d6d91d71032d09ed1027ba1ef29eed26f890c5a" "php/LICENSE-php.txt"

# ─────────────────────────────────────────────────────────────────────────────
if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "Runtime integrity check FAILED - files may have been tampered with or are outdated."
  exit 1
fi

echo "All runtime integrity checks passed."
