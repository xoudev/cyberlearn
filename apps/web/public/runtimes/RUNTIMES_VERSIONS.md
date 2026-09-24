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
| `pyodide.asm.js` | 1 253 804 B | `3a889f073e628c2196c705b42fa0e955ba2e25c034b1e3dd589c35be675bc01b` |
| `pyodide.asm.wasm` | 10 103 326 B | `f7fefe563134714a17abd65516d94960e8dbd96fe6778a7a842947fc9686b3a1` |
| `pyodide-lock.json` | 112 205 B | `be1807745da93daa09d360b109c17a0e526e74d664d1f1b9870aafcce98ce426` |
| `python_stdlib.zip` | 2 358 894 B | `6030964967e447c887abc46c5f0967c55688644d759496de82a3ef09f49f5cba` |

**Total**: ~14.2 MB

### Upgrade procedure

1. Update `PYODIDE_VERSION` in `scripts/download-runtimes.sh`
2. Run `bash scripts/download-runtimes.sh`: this will fail on hash mismatch
3. Copy the new hashes from the sha256sum output into:
   - `scripts/download-runtimes.sh` (EXPECTED_HASHES)
   - `scripts/verify-runtimes.sh` (EXPECTED)
   - This file (table above)
4. Run `bash scripts/verify-runtimes.sh` to confirm
5. Update the version reference in `public/pyodide-worker.js` comment
6. Commit all changed files together

## JSCPP 2.0.9 (browser IIFE bundle)

**Source**: npm registry, `JSCPP@2.0.9` (package `lib/commonjs.js`, bundled with esbuild)
**Date captured**: 2026-05-09
**Served at**: `/runtimes/jscpp/`
**Tarball SHA-256**: `fa83b3ef9eefb1ee496eb06a70bbb96012d9004bf4529313001fd2ab07d629f6`

| File | Size | SHA-256 |
|------|------|---------|
| `bundle.js` | 1 063 277 B | `326e3d3c6aef358db734f8d8a1b053e13054d339ca694663d637a603b16d6d07` |

**Total**: ~1.0 MB

### Background

JSCPP exists on npm as `JSCPP` (uppercase), max version `2.0.9`. The CDN URL
previously referenced in `code-playground.tsx` (`jscpp@2.3.1/browser/bundle.js`)
points to a version and path that do not exist; that URL has always been a 404.

The npm package ships only `lib/commonjs.js` (Node.js CommonJS). To run in a
Web Worker via `importScripts`, it must be bundled as a browser IIFE that exposes
`self.JSCPP`. This was done with esbuild 0.27.7 using `--format=iife --global-name=JSCPP`.

The `printf` runtime dependency uses Node.js built-ins (`util`, `stream`) for
features not exercised by JSCPP (object inspection, stream writing). These are
stubbed with empty shims in `scripts/build-jscpp/build.sh`.

### API (JSCPP.run)

```js
// Synchronous. Called from inside a Web Worker.
JSCPP.run(
  code,           // C++ source string (requires "using namespace std;", std:: prefix unsupported)
  input,          // stdin string, e.g. ""
  {
    maxTimeout: 10000,           // ms, throws "Time limit exceeded." on breach
    stdio: { write(s) { ... } } // called with each output chunk
  }
);
// Returns: exit code (integer, 0 = success)
// Throws:  on parse error or runtime error
```

### Rebuild procedure

1. Bump `JSCPP_VERSION` in `scripts/build-jscpp/build.sh` if upgrading
2. Update `JSCPP_TARBALL_SHA256` in the same file (get from `sha256sum JSCPP-x.y.z.tgz`)
3. Run `bash scripts/build-jscpp/build.sh`
4. Copy the SHA-256 printed at the end into:
   - `scripts/verify-runtimes.sh` (jscpp/bundle.js line)
   - This file (table above)
5. Run `bash scripts/verify-runtimes.sh` to confirm
6. Commit `bundle.js` + `verify-runtimes.sh` + this file together
