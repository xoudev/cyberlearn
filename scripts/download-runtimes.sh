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
