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

## sql.js 1.14.2 (SQLite in WebAssembly)

**Source**: npm registry, `sql.js@1.14.2` (MIT), files from `package/dist/`
**Tarball SHA-256**: `9d491337e1850df39362be640c23f9751bf0fbd33fc232c2a580bb87b70d62fd`
**Served at**: `/runtimes/sqljs/`
**Used by**: `<SqlPlayground>` and `<SqlInjectionLab>` (`apps/web/lib/sql/sandbox.ts`)

| File | Size | SHA-256 |
|------|------|---------|
| `worker.sql-wasm.js` | 49 972 B | `92a4031e278cdb20e5841296e0265b0e973f3190c30f2ec86fcb13bffa89ba5c` |
| `sql-wasm.wasm` | 658 410 B | `38c14f6e379210bc942bdc4ebca44e7bfdb4318ecc1c72ca666a28fdce96670a` |

**Total**: ~0.7 MB, loaded only when a learner runs a first query.

The worker build runs SQLite off the page's thread: a query that never ends
(a recursive CTE without a stop) is cut by terminating the worker, and the
page never freezes. The worker finds `sql-wasm.wasm` next to itself.

## php-wasm 0.2.0 (PHP 8.4 in WebAssembly)

**Source**: npm registry, `php-wasm@0.2.0`, under the Apache-2.0 option of its "Apache-2.0 OR GPL-2.0-only" licence
**Tarball SHA-256**: `c8f15b8dca23da7de3effd40db713efc4abcf8bac7647f1aeaba6943d512b6e2`
**PHP**: 8.4.1, under the PHP License 3.01 (`LICENSE-php.txt`, from the php-src tag `php-8.4.1`)
**Served at**: `/runtimes/php/`
**Used by**: `<PhpLab>` (`apps/web/public/workers/php-lab.mjs`, `apps/web/lib/php/sandbox.ts`)

| File | Size | SHA-256 |
|------|------|---------|
| `php8.4-web.mjs` | 716 676 B | `504312263241f39008f3ea1c9dd305c8984156eb31c163e9be560d8438cd9c7c` |
| `6733ae879e026f8b36961884052b87de4def4e15.wasm` | 12 868 946 B | `7da04fb61f9be008c79eb1eee385dab5ed3d3702f7bed07dd65fd82ba3bf3729` |
| `PhpBase.mjs` | 16 928 B | `2edb5379b4ebafe7e450021cd651cd92cb3022857d6be81de4a6e4f52fb96dc1` |
| `OutputBuffer.mjs` | 1 939 B | `fdf73a3e360c715bdc8f745b5aa148dbfdf2a9c5808c18cf2e422ecf97061785` |
| `_Event.mjs` | 432 B | `bbfd97aa6bfd6820733a2be211db73c8e7075ea5e2dbaa1ae29fba3d7a328d00` |
| `fsOps.mjs` | 5 450 B | `bcc046e37c3d6cf1d39756b47c7d0dc31eec1f9dd7c901e160735bcb9b21b501` |
| `resolveDependencies.mjs` | 3 089 B | `f70c7f469d6d47ee268421e976e0f3e536f418f6b1bc8988b0c77d1c912ed08b` |
| `LICENSE-php-wasm.txt` | 9 144 B | `becde03a3c8b9b2e3d58c7b65ca7ffd9e18e98162396cc374052983c1faaa47c` |
| `NOTICE-php-wasm.txt` | 1 279 B | `8bfd3338b7e408a48fa53f74a13a3bf71a553a70ada869c090e1a7d7070d32f8` |
| `LICENSE-php.txt` | 3 204 B | `b42e4df5e50e6ecda1047d503d6d91d71032d09ed1027ba1ef29eed26f890c5a` |

**Total**: 13.6 MB of runtime, loaded only when a learner sends a first request, then cached by the browser.

Only the PHP 8.4 build for the page, its wrapper and the files the wrapper
imports are kept. The package carries six PHP versions of 12 to 16 MB each, and
SDL, CGI and Node variants: none of them is used. Nothing in the vendored files
is modified. What the site adds lives in `public/workers/php-lab*.mjs`:

- the wrapper's page build runs in a Web Worker (a module worker), where it
  finds no `document`: the worker gives it two empty stand-ins before loading it;
- each request gets a PHP instance of its own, built from one compiled module,
  and thrown away after: PHP keeps its state between two runs of the same
  instance, and loses its `php.ini` on a refresh, so an instance is never reused;
- the `php.ini` closes what a lab has no use for: the bridge to JavaScript
  (`vrzno_*` and the `Vrzno` class), `exec` and its kin, `mail`, sockets, and
  `allow_url_fopen`. The harness checks it is in force before running anything.

A page that never ends is cut by terminating the worker; a page that eats all
the memory ends with PHP's own refusal, and the next request is unaffected.

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
| `bash` | Debian 12 `bash-static_5.2.15-2+b13_i386.deb`, `bin/bash-static` | 2 605 584 B | `eb5062d5e2fa6437dc7e7b5623879c3cdec34499c68d445ad6c9295390e93898` |
| `terminfo-linux` | Debian 12 `ncurses-base_6.4-4_all.deb`, `lib/terminfo/l/linux` | 1 740 B | `b70a4941416eb703a01b5a06fd1c914880452302b0e0b2a7dea12600607824a7` |

**npm tarball SHA-256**: `1384ad8bbe80aa4f6cd43f43bd16ddbd7495931df833f038a27fcdc8b9a31351`
**bash-static package SHA-256** (as published by Debian): `e69f3c2b832f1d1c58534dd1a4dc816f880d6f781cf05d138d36745a5a84128c`
**ncurses-base package SHA-256** (as published by Debian): `bfd1d89f833c09a28b062ee916495cf69649ca2bf529532476c7b69d75d24909`
**Total**: ~15.3 MB

The image is a Linux 6.8.12 kernel (i686) with an embedded Buildroot 2024.05.2
root filesystem: BusyBox, a root shell on the serial console, no network. It
boots to a `~%` prompt in a few seconds.

The image has BusyBox's `ash` and no bash. `bash` is Debian's statically
linked bash 5.2.15 for i386, taken from the `bash-static` package of the
signed Debian archive. The page writes it into the machine once the shell is
up, and one line (`installBashCommand`, `lib/linux-terminal/session.ts`)
puts it in `/bin/bash`, so `#!/bin/bash` scripts run:

- the root filesystem is capped at half the memory, about 16 MB, and the
  image fills all but 1.7 MB of it: the line raises the cap to 24 MB first;
- a copy that fails leaves no `/bin/bash` rather than a truncated one;
- the image has no terminal database, and without one bash's line editor
  treats the screen as a dumb terminal and scrolls long lines sideways:
  `terminfo-linux`, Debian's compiled entry for the machine's `TERM`,
  goes to `/lib/terminfo/l/linux`;
- `/root/.bashrc` sets bash's prompt to `bash mnt% `: it ends in `% ` like
  ash's, which the page waits for before checking the learner's work. It
  also turns bracketed paste off, so a pasted command reaches the page as
  plain keys, as it does under ash.

The learner's shell stays `ash`; typing `bash` opens a bash, `exit` leaves it.

### Licences

- v86: BSD-2-Clause, `LICENSE-v86.txt` next to the files.
- SeaBIOS (`seabios.bin`): LGPL-3.0. VGA BIOS (`vgabios.bin`): LGPL.
- The image contains the Linux kernel and BusyBox, both GPL-2.0, assembled with
  Buildroot. We redistribute them unmodified, as published by the v86 project;
  their corresponding sources are those of Linux 6.8.12 (kernel.org), BusyBox
  and Buildroot 2024.05.2 (buildroot.org), with the configuration published in
  the v86 repository. A written source offer must accompany the image if it
  is ever distributed in any other form than this public repository.
- `bash`: GPL-3.0-or-later, redistributed unmodified from Debian, with
  Debian's notice as `LICENSE-bash.txt`. Its source is Debian's `bash` source
  package, version 5.2.15-2, on sources.debian.org.
- `terminfo-linux`: from ncurses, MIT/X11 licence, Debian's notice as
  `LICENSE-ncurses.txt`.

### Upgrade procedure

1. Change `V86_VERSION`, `V86_BIOS_COMMIT` or `V86_IMAGE` in
   `scripts/download-runtimes.sh`.
2. Run it: it fails on the first hash mismatch, printing the new hash.
3. Report the new hashes in `download-runtimes.sh`, `verify-runtimes.sh` and
   this table, then boot a lesson terminal before committing.
