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

## v86 0.5.462 and a Buildroot Linux image

The real terminal of the Linux lessons (`<LinuxTerminal>`): an x86 emulator in
WebAssembly that boots a small Linux in the learner's browser. Nothing runs on
our servers; these files are only downloaded, on the learner's first click on
"Démarrer la machine", then cached by the browser.

**Served at**: `/runtimes/v86/`
**Date captured**: 2026-09-28

| File | Source | Size | SHA-256 |
|------|--------|------|---------|
| `libv86.js` | npm `v86@0.5.462`, `build/libv86.js` | 359 591 B | `8715206b8c5ab0a206f6e8913c5f705a15547df51d3e0c032e3d00439303c94c` |
| `v86.wasm` | npm `v86@0.5.462`, `build/v86.wasm` | 2 101 621 B | `aa0d0e149d6b60063b85de4871e78505637ce92821e14a9f9802c4008ba2336e` |
| `seabios.bin` | github.com/copy/v86 `bios/`, commit `b8a39b11dd2076870699e6cac053556271b9bfab` | 131 072 B | `73e3f359102e3a9982c35fce98eb7cd08f18303ac7f1ba6ebfbe6cdc1c244d98` |
| `vgabios.bin` | same commit | 36 352 B | `a4bc0d80cc3ca028c73dafa8fee396b8d054ce87ebd8abfbd31b06b437607880` |
| `buildroot-bzimage68.bin` | https://i.copy.sh/buildroot-bzimage68.bin | 10 068 480 B | `507a759c70ab7a490a233be454d0b5b88bc667956a410b531cb4edc091e2eb1c` |

**npm tarball SHA-256**: `1384ad8bbe80aa4f6cd43f43bd16ddbd7495931df833f038a27fcdc8b9a31351`
**Total**: ~12.7 MB

The image is a Linux 6.8.12 kernel (i686) with an embedded Buildroot 2024.05.2
root filesystem: BusyBox, a root shell on the serial console, no network. It
boots to a `~%` prompt in a few seconds.

### Licences

- v86: BSD-2-Clause, `LICENSE-v86.txt` next to the files.
- SeaBIOS (`seabios.bin`): LGPL-3.0. VGA BIOS (`vgabios.bin`): LGPL.
- The image contains the Linux kernel and BusyBox, both GPL-2.0, assembled with
  Buildroot. We redistribute them unmodified, as published by the v86 project;
  their corresponding sources are those of Linux 6.8.12 (kernel.org), BusyBox
  and Buildroot 2024.05.2 (buildroot.org), with the configuration published in
  the v86 repository. A written source offer must accompany the image if it
  is ever distributed in any other form than this public repository.

### Upgrade procedure

1. Change `V86_VERSION`, `V86_BIOS_COMMIT` or `V86_IMAGE` in
   `scripts/download-runtimes.sh`.
2. Run it: it fails on the first hash mismatch, printing the new hash.
3. Report the new hashes in `download-runtimes.sh`, `verify-runtimes.sh` and
   this table, then boot a lesson terminal before committing.
