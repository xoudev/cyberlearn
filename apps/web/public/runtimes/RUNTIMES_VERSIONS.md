# Bundled Runtimes

Static runtime files served locally to eliminate CDN dependency and prevent
supply-chain attacks via third-party script loading.

Files are committed to git (no LFS). Run `scripts/verify-runtimes.sh` to
confirm integrity. Run `scripts/download-runtimes.sh` to re-download after
a version bump.

## Pyodide 0.27.5

**Source**: https://cdn.jsdelivr.net/pyodide/v0.27.5/full/
**Date captured**: 2026-05-08
**Served at**: `/runtimes/pyodide/`

| File | Size | SHA-256 |
|------|------|---------|
| `pyodide.js` | 14 928 B | `7fdbe66e53f68f6a4e93c295a667371759be093d2bd402bb44545514584039b6` |
| `pyodide-lock.json` | 112 205 B | `be1807745da93daa09d360b109c17a0e526e74d664d1f1b9870aafcce98ce426` |
| `python_stdlib.zip` | 2 358 894 B | `6030964967e447c887abc46c5f0967c55688644d759496de82a3ef09f49f5cba` |
| `pyodide.asm.wasm` | 10 103 326 B | `f7fefe563134714a17abd65516d94960e8dbd96fe6778a7a842947fc9686b3a1` |

**Total**: ~13 MB

### Upgrade procedure

1. Update `PYODIDE_VERSION` in `scripts/download-runtimes.sh`
2. Run `bash scripts/download-runtimes.sh` — this will fail on hash mismatch
3. Copy the new hashes from the sha256sum output into:
   - `scripts/download-runtimes.sh` (EXPECTED_HASHES)
   - `scripts/verify-runtimes.sh` (EXPECTED)
   - This file (table above)
4. Run `bash scripts/verify-runtimes.sh` to confirm
5. Update the version reference in `public/pyodide-worker.js` comment
6. Commit all changed files together

## JSCPP — NOT BUNDLED (build required)

The C++ challenge runner (`code-playground.tsx`) currently loads from a broken
CDN URL: `https://cdn.jsdelivr.net/npm/jscpp@2.3.1/browser/bundle.js` (HTTP 404).

**Root cause**: JSCPP exists on npm as `JSCPP` (uppercase), latest version `2.0.9`.
Version `2.3.1` does not exist. The `browser/bundle.js` path does not exist in any
published version — the package only ships `lib/commonjs.js` (Node.js CommonJS).

**To bundle JSCPP locally**, a browser UMD build must be produced first:
1. Extract the npm tarball (`JSCPP-2.0.9.tgz`)
2. Run webpack/browserify on `lib/commonjs.js` targeting UMD
3. Verify the output bundle runs in a Web Worker (`importScripts`)
4. Commit `apps/web/public/runtimes/jscpp/bundle.js` with SHA-256 documented here
5. Update `scripts/verify-runtimes.sh` to include the new file
6. Update `code-playground.tsx` to use `/runtimes/jscpp/bundle.js`

This build step is tracked as sub-step C of PR 1.4 (Code Runner Hardening).
Until then, the C++ tab in CodePlayground loads but fails silently (404 on importScripts).
