#!/usr/bin/env bash
# =============================================================================
# download-runtimes.sh - Download and verify the bundled runtime files
#
# Run this script whenever you upgrade Pyodide or v86, or need to (re)populate
# apps/web/public/runtimes/pyodide/ and apps/web/public/runtimes/v86/ from
# scratch.
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
# Update these hashes whenever PYODIDE_VERSION changes - run sha256sum on
# each file after download, then paste the output here and rerun verify.
declare -A EXPECTED_HASHES=(
  [pyodide.js]="7fdbe66e53f68f6a4e93c295a667371759be093d2bd402bb44545514584039b6"
  [pyodide.asm.js]="3a889f073e628c2196c705b42fa0e955ba2e25c034b1e3dd589c35be675bc01b"
  [pyodide.asm.wasm]="f7fefe563134714a17abd65516d94960e8dbd96fe6778a7a842947fc9686b3a1"
  [pyodide-lock.json]="be1807745da93daa09d360b109c17a0e526e74d664d1f1b9870aafcce98ce426"
  [python_stdlib.zip]="6030964967e447c887abc46c5f0967c55688644d759496de82a3ef09f49f5cba"
)

FILES=(pyodide.js pyodide.asm.js pyodide.asm.wasm pyodide-lock.json python_stdlib.zip)

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
  echo "INTEGRITY CHECK FAILED - do not use these files"
  exit 1
fi

echo ""
echo "All files verified. Pyodide ${PYODIDE_VERSION} ready in ${DEST} (5 files)"

# ── v86 + Buildroot Linux ────────────────────────────────────────────────────
# The emulator comes from its npm tarball, the BIOS from the v86 repository at
# a pinned commit (never master), the Linux image from the project's image
# host. Every file is checked against its hash before anything is kept.
V86_VERSION="0.5.462"
V86_TARBALL_SHA="1384ad8bbe80aa4f6cd43f43bd16ddbd7495931df833f038a27fcdc8b9a31351"
V86_BIOS_COMMIT="b8a39b11dd2076870699e6cac053556271b9bfab"
V86_IMAGE="buildroot-bzimage68.bin"
V86_DEST="$(dirname "$0")/../apps/web/public/runtimes/v86"

declare -A V86_HASHES=(
  [libv86.js]="8715206b8c5ab0a206f6e8913c5f705a15547df51d3e0c032e3d00439303c94c"
  [v86.wasm]="aa0d0e149d6b60063b85de4871e78505637ce92821e14a9f9802c4008ba2336e"
  [seabios.bin]="73e3f359102e3a9982c35fce98eb7cd08f18303ac7f1ba6ebfbe6cdc1c244d98"
  [vgabios.bin]="a4bc0d80cc3ca028c73dafa8fee396b8d054ce87ebd8abfbd31b06b437607880"
  [${V86_IMAGE}]="507a759c70ab7a490a233be454d0b5b88bc667956a410b531cb4edc091e2eb1c"
)

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$V86_DEST"

echo ""
echo "=== Downloading v86 ${V86_VERSION} and ${V86_IMAGE} ==="
curl -fsSL "https://registry.npmjs.org/v86/-/v86-${V86_VERSION}.tgz" -o "${WORK}/v86.tgz"
if [[ "$(sha256sum "${WORK}/v86.tgz" | cut -d' ' -f1)" != "$V86_TARBALL_SHA" ]]; then
  echo "INTEGRITY CHECK FAILED - v86 tarball"
  exit 1
fi
tar -xzf "${WORK}/v86.tgz" -C "$WORK"
cp "${WORK}/package/build/libv86.js" "${WORK}/package/build/v86.wasm" "$V86_DEST/"
cp "${WORK}/package/LICENSE" "${V86_DEST}/LICENSE-v86.txt"
for bios in seabios.bin vgabios.bin; do
  curl -fsSL "https://raw.githubusercontent.com/copy/v86/${V86_BIOS_COMMIT}/bios/${bios}" -o "${V86_DEST}/${bios}"
done
curl -fsSL "https://i.copy.sh/${V86_IMAGE}" -o "${V86_DEST}/${V86_IMAGE}"

for file in "${!V86_HASHES[@]}"; do
  actual=$(sha256sum "${V86_DEST}/${file}" | cut -d' ' -f1)
  if [[ "$actual" != "${V86_HASHES[$file]}" ]]; then
    echo "INTEGRITY CHECK FAILED - v86/${file}"
    echo "  expected: ${V86_HASHES[$file]}"
    echo "  actual:   ${actual}"
    exit 1
  fi
  echo "  ✓ v86/${file}"
done
echo "v86 ${V86_VERSION} ready in ${V86_DEST}"

# ── bash for the v86 machine ─────────────────────────────────────────────────
# The image has BusyBox's ash only. Debian's statically linked bash, from the
# signed archive, is served next to it and copied to /bin/bash at boot. The
# package is checked against the hash Debian publishes, the binary against ours.
# A .deb is an ar archive: ar and tar unpack it without dpkg.
BASH_DEB="bash-static_5.2.15-2+b13_i386.deb"
BASH_DEB_SHA="e69f3c2b832f1d1c58534dd1a4dc816f880d6f781cf05d138d36745a5a84128c"
BASH_SHA="eb5062d5e2fa6437dc7e7b5623879c3cdec34499c68d445ad6c9295390e93898"
curl -fsSL "https://deb.debian.org/debian/pool/main/b/bash/${BASH_DEB}" -o "${WORK}/${BASH_DEB}"
if [[ "$(sha256sum "${WORK}/${BASH_DEB}" | cut -d' ' -f1)" != "$BASH_DEB_SHA" ]]; then
  echo "INTEGRITY CHECK FAILED - ${BASH_DEB}"
  exit 1
fi
mkdir -p "${WORK}/bash-static"
(cd "${WORK}" && ar x "${BASH_DEB}" data.tar.xz)
tar -xJf "${WORK}/data.tar.xz" -C "${WORK}/bash-static" ./bin/bash-static ./usr/share/doc/bash-static/copyright
cp "${WORK}/bash-static/bin/bash-static" "${V86_DEST}/bash"
cp "${WORK}/bash-static/usr/share/doc/bash-static/copyright" "${V86_DEST}/LICENSE-bash.txt"
if [[ "$(sha256sum "${V86_DEST}/bash" | cut -d' ' -f1)" != "$BASH_SHA" ]]; then
  echo "INTEGRITY CHECK FAILED - v86/bash"
  exit 1
fi
echo "  ✓ v86/bash (bash 5.2.15, static)"

# The image has no terminal database: without one, bash's line editor treats
# the screen as a dumb terminal. Debian's compiled entry for TERM=linux comes
# from ncurses-base, checked the same way.
NCURSES_DEB="ncurses-base_6.4-4_all.deb"
NCURSES_DEB_SHA="bfd1d89f833c09a28b062ee916495cf69649ca2bf529532476c7b69d75d24909"
TERMINFO_SHA="b70a4941416eb703a01b5a06fd1c914880452302b0e0b2a7dea12600607824a7"
curl -fsSL "https://deb.debian.org/debian/pool/main/n/ncurses/${NCURSES_DEB}" -o "${WORK}/${NCURSES_DEB}"
if [[ "$(sha256sum "${WORK}/${NCURSES_DEB}" | cut -d' ' -f1)" != "$NCURSES_DEB_SHA" ]]; then
  echo "INTEGRITY CHECK FAILED - ${NCURSES_DEB}"
  exit 1
fi
mkdir -p "${WORK}/ncurses-base"
(cd "${WORK}" && rm -f data.tar.xz && ar x "${NCURSES_DEB}" data.tar.xz)
tar -xJf "${WORK}/data.tar.xz" -C "${WORK}/ncurses-base" ./lib/terminfo/l/linux ./usr/share/doc/ncurses-base/copyright
cp "${WORK}/ncurses-base/lib/terminfo/l/linux" "${V86_DEST}/terminfo-linux"
cp "${WORK}/ncurses-base/usr/share/doc/ncurses-base/copyright" "${V86_DEST}/LICENSE-ncurses.txt"
if [[ "$(sha256sum "${V86_DEST}/terminfo-linux" | cut -d' ' -f1)" != "$TERMINFO_SHA" ]]; then
  echo "INTEGRITY CHECK FAILED - v86/terminfo-linux"
  exit 1
fi
echo "  ✓ v86/terminfo-linux (ncurses 6.4)"

# ── sql.js (SQLite compiled to WebAssembly, in a Web Worker) ─────────────────
# The worker build and its .wasm only: the page talks to the worker, nothing
# of sql.js is bundled into the site.
SQLJS_VERSION="1.14.2"
SQLJS_TARBALL_SHA="9d491337e1850df39362be640c23f9751bf0fbd33fc232c2a580bb87b70d62fd"
SQLJS_DEST="$(dirname "$0")/../apps/web/public/runtimes/sqljs"

declare -A SQLJS_HASHES=(
  [worker.sql-wasm.js]="92a4031e278cdb20e5841296e0265b0e973f3190c30f2ec86fcb13bffa89ba5c"
  [sql-wasm.wasm]="38c14f6e379210bc942bdc4ebca44e7bfdb4318ecc1c72ca666a28fdce96670a"
)

mkdir -p "$SQLJS_DEST" "${WORK}/sqljs"
echo ""
echo "=== Downloading sql.js ${SQLJS_VERSION} ==="
curl -fsSL "https://registry.npmjs.org/sql.js/-/sql.js-${SQLJS_VERSION}.tgz" -o "${WORK}/sqljs.tgz"
if [[ "$(sha256sum "${WORK}/sqljs.tgz" | cut -d' ' -f1)" != "$SQLJS_TARBALL_SHA" ]]; then
  echo "INTEGRITY CHECK FAILED - sql.js tarball"
  exit 1
fi
tar -xzf "${WORK}/sqljs.tgz" -C "${WORK}/sqljs"
cp "${WORK}/sqljs/package/dist/worker.sql-wasm.js" "${WORK}/sqljs/package/dist/sql-wasm.wasm" "$SQLJS_DEST/"
cp "${WORK}/sqljs/package/LICENSE" "${SQLJS_DEST}/LICENSE-sqljs.txt"
for file in "${!SQLJS_HASHES[@]}"; do
  actual=$(sha256sum "${SQLJS_DEST}/${file}" | cut -d' ' -f1)
  if [[ "$actual" != "${SQLJS_HASHES[$file]}" ]]; then
    echo "INTEGRITY CHECK FAILED - sqljs/${file}"
    exit 1
  fi
  echo "  ✓ sqljs/${file}"
done
echo "sql.js ${SQLJS_VERSION} ready in ${SQLJS_DEST}"

# ── php-wasm: PHP 8.4 in WebAssembly, the web labs' real server ──────────────
# The build for the page (php8.4-web.mjs and its .wasm), its wrapper and the
# four files the wrapper imports: nothing else of the package. The other PHP
# versions it carries (8.0 to 8.5, 12 to 16 MB each) are left out. Taken under
# the Apache-2.0 option of the package's "Apache-2.0 OR GPL-2.0-only"; PHP
# itself is under the PHP License 3.01, whose text travels with the binary.
PHP_WASM_VERSION="0.2.0"
PHP_WASM_TARBALL_SHA="c8f15b8dca23da7de3effd40db713efc4abcf8bac7647f1aeaba6943d512b6e2"
PHP_LICENSE_URL="https://raw.githubusercontent.com/php/php-src/php-8.4.1/LICENSE"
PHP_LICENSE_SHA="b42e4df5e50e6ecda1047d503d6d91d71032d09ed1027ba1ef29eed26f890c5a"
PHP_DEST="$(dirname "$0")/../apps/web/public/runtimes/php"

declare -A PHP_HASHES=(
  [php8.4-web.mjs]="504312263241f39008f3ea1c9dd305c8984156eb31c163e9be560d8438cd9c7c"
  [6733ae879e026f8b36961884052b87de4def4e15.wasm]="7da04fb61f9be008c79eb1eee385dab5ed3d3702f7bed07dd65fd82ba3bf3729"
  [PhpBase.mjs]="2edb5379b4ebafe7e450021cd651cd92cb3022857d6be81de4a6e4f52fb96dc1"
  [OutputBuffer.mjs]="fdf73a3e360c715bdc8f745b5aa148dbfdf2a9c5808c18cf2e422ecf97061785"
  [_Event.mjs]="bbfd97aa6bfd6820733a2be211db73c8e7075ea5e2dbaa1ae29fba3d7a328d00"
  [fsOps.mjs]="bcc046e37c3d6cf1d39756b47c7d0dc31eec1f9dd7c901e160735bcb9b21b501"
  [resolveDependencies.mjs]="f70c7f469d6d47ee268421e976e0f3e536f418f6b1bc8988b0c77d1c912ed08b"
  [LICENSE-php-wasm.txt]="becde03a3c8b9b2e3d58c7b65ca7ffd9e18e98162396cc374052983c1faaa47c"
  [NOTICE-php-wasm.txt]="8bfd3338b7e408a48fa53f74a13a3bf71a553a70ada869c090e1a7d7070d32f8"
)

mkdir -p "$PHP_DEST" "${WORK}/php"
echo ""
echo "=== Downloading php-wasm ${PHP_WASM_VERSION} ==="
curl -fsSL "https://registry.npmjs.org/php-wasm/-/php-wasm-${PHP_WASM_VERSION}.tgz" -o "${WORK}/php.tgz"
if [[ "$(sha256sum "${WORK}/php.tgz" | cut -d' ' -f1)" != "$PHP_WASM_TARBALL_SHA" ]]; then
  echo "INTEGRITY CHECK FAILED - php-wasm tarball"
  exit 1
fi
tar -xzf "${WORK}/php.tgz" -C "${WORK}/php"
for file in PhpBase.mjs OutputBuffer.mjs _Event.mjs fsOps.mjs resolveDependencies.mjs php8.4-web.mjs 6733ae879e026f8b36961884052b87de4def4e15.wasm; do
  cp "${WORK}/php/package/${file}" "${PHP_DEST}/${file}"
done
cp "${WORK}/php/package/LICENSE" "${PHP_DEST}/LICENSE-php-wasm.txt"
cp "${WORK}/php/package/NOTICE" "${PHP_DEST}/NOTICE-php-wasm.txt"
curl -fsSL "$PHP_LICENSE_URL" -o "${PHP_DEST}/LICENSE-php.txt"
if [[ "$(sha256sum "${PHP_DEST}/LICENSE-php.txt" | cut -d' ' -f1)" != "$PHP_LICENSE_SHA" ]]; then
  echo "INTEGRITY CHECK FAILED - php/LICENSE-php.txt"
  exit 1
fi
for file in "${!PHP_HASHES[@]}"; do
  actual=$(sha256sum "${PHP_DEST}/${file}" | cut -d' ' -f1)
  if [[ "$actual" != "${PHP_HASHES[$file]}" ]]; then
    echo "INTEGRITY CHECK FAILED - php/${file}"
    exit 1
  fi
  echo "  ✓ php/${file}"
done
echo "php-wasm ${PHP_WASM_VERSION} ready in ${PHP_DEST}"
