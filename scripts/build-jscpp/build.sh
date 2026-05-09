#!/usr/bin/env bash
# =============================================================================
# build-jscpp/build.sh — Build JSCPP 2.0.9 as a browser IIFE bundle
#
# One-shot script. Run when bumping the JSCPP version or when the bundle needs
# to be regenerated from scratch. The output is committed to git.
#
# Requires: node, npm, sha256sum (coreutils), and esbuild (via pnpm store).
#
# Usage:
#   bash scripts/build-jscpp/build.sh
#
# After running:
#   1. Check the SHA-256 printed at the end
#   2. Update scripts/verify-runtimes.sh (JSCPP section) with the new hash
#   3. Update RUNTIMES_VERSIONS.md table with the new hash and bundle size
#   4. Commit all three files together
# =============================================================================
set -euo pipefail

JSCPP_VERSION="2.0.9"

# SHA-256 of the JSCPP-2.0.9.tgz tarball as published on the npm registry.
# Verify with: sha256sum JSCPP-2.0.9.tgz
JSCPP_TARBALL_SHA256="fa83b3ef9eefb1ee496eb06a70bbb96012d9004bf4529313001fd2ab07d629f6"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="${REPO_ROOT}/apps/web/public/runtimes/jscpp"
ESBUILD="${REPO_ROOT}/node_modules/.pnpm/node_modules/.bin/esbuild"

if [[ ! -x "${ESBUILD}" ]]; then
  echo "ERROR: esbuild not found at ${ESBUILD}"
  echo "Run 'pnpm install' from the monorepo root first."
  exit 1
fi

echo ">>> Building JSCPP ${JSCPP_VERSION} browser bundle..."
echo "    dest: ${DEST}/bundle.js"
echo "    esbuild: ${ESBUILD} ($(${ESBUILD} --version))"
echo ""

TMP="$(mktemp -d)"
# shellcheck disable=SC2064
trap "rm -rf ${TMP}" EXIT

# ── Step 1: Download and verify tarball ────────────────────────────────────────
echo "[1/4] Downloading JSCPP@${JSCPP_VERSION} from npm registry..."
cd "${TMP}"
npm pack "JSCPP@${JSCPP_VERSION}" --quiet
TARBALL="JSCPP-${JSCPP_VERSION}.tgz"

actual=$(sha256sum "${TARBALL}" | cut -d' ' -f1)
if [[ "${actual}" != "${JSCPP_TARBALL_SHA256}" ]]; then
  echo "FATAL: tarball hash mismatch — possible tampering or version mismatch"
  echo "  expected: ${JSCPP_TARBALL_SHA256}"
  echo "  actual:   ${actual}"
  exit 1
fi
echo "OK: tarball hash verified (${actual:0:16}...)"

# ── Step 2: Extract and install runtime deps ───────────────────────────────────
echo "[2/4] Extracting and installing runtime dependencies..."
mkdir -p build
tar -xzf "${TARBALL}" -C build --strip-components=1
cd build

# Install only runtime deps (lodash, pegjs-util, printf). Skip lifecycle
# scripts to avoid trying to run `grunt build` (devDep, not installed).
npm install --omit=dev --ignore-scripts --quiet

# ── Step 3: Create stubs for Node.js built-ins used by `printf` ───────────────
# `printf` (a JSCPP runtime dep) requires `util` and `stream` for features
# we don't use (object inspection, stream writing). Stub them minimally.
echo "[3/4] Creating Node.js built-in stubs for browser bundling..."
mkdir -p _stubs
cat > _stubs/util.js << 'STUBEOF'
module.exports = { inspect: function(x) { return String(x); } };
STUBEOF
cat > _stubs/stream.js << 'STUBEOF'
module.exports = { Stream: function Stream() {} };
STUBEOF

# ── Step 4: Bundle with esbuild ────────────────────────────────────────────────
echo "[4/4] Bundling with esbuild (IIFE, global-name=JSCPP)..."
mkdir -p "${DEST}"
"${ESBUILD}" lib/commonjs.js \
  --bundle \
  --format=iife \
  --global-name=JSCPP \
  --platform=browser \
  --alias:util=./_stubs/util.js \
  --alias:stream=./_stubs/stream.js \
  --outfile="${DEST}/bundle.js"

BUNDLE_SHA=$(sha256sum "${DEST}/bundle.js" | cut -d' ' -f1)
BUNDLE_SIZE=$(wc -c < "${DEST}/bundle.js")

echo ""
echo "================================================================"
echo "Build complete."
echo ""
echo "  File:    ${DEST}/bundle.js"
printf "  Size:    %'d bytes\n" "${BUNDLE_SIZE}"
echo "  SHA-256: ${BUNDLE_SHA}"
echo ""
echo "Next steps:"
echo "  1. Update scripts/verify-runtimes.sh  →  [jscpp/bundle.js]=\"${BUNDLE_SHA}\""
echo "  2. Update RUNTIMES_VERSIONS.md table with size and hash above"
echo "  3. Commit bundle.js + verify-runtimes.sh + RUNTIMES_VERSIONS.md"
echo "================================================================"
