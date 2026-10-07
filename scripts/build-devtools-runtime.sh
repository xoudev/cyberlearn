#!/usr/bin/env bash
# =============================================================================
# build-devtools-runtime.sh - Build apps/web/public/runtimes/v86/devtools.tar.gz
#
# A real C and assembly toolchain for the v86 Linux machine: bash, git,
# sqlite3, nasm, gcc, gdb, python3. The Buildroot image's own kernel and
# BusyBox are kept untouched (every existing lesson's machine stays exactly
# as it was); this is a second, opt-in archive a lesson can ask the page to
# extract on top of it, at `cyberlearn-devtools` (see lib/linux-terminal/
# devtools.ts for the extraction command and what it costs).
#
# Built from Alpine Linux i386's own prebuilt packages (musl libc, so the
# machine's BusyBox binaries keep working unmodified) rather than compiled
# from source: Buildroot does not ship gcc *on* the target it cross-builds,
# only the cross-compiler that runs on the build host.
#
# Run this whenever the package set or trimming below changes, then
# re-run verify-runtimes.sh and update its hash and RUNTIMES_VERSIONS.md.
#
# Requires Docker (linux/386 emulation via QEMU on a non-x86 host, which
# Docker Desktop provides automatically).
#
# Usage:
#   bash scripts/build-devtools-runtime.sh
# =============================================================================
set -euo pipefail

# Alpine 3.20.10 for i386, pinned by digest like the other runtimes pin an
# exact version: `docker pull i386/alpine:3.20` then `docker inspect
# --format='{{index .RepoDigests 0}}'` to update.
ALPINE_IMAGE="i386/alpine@sha256:7a8859515d7d0d58007b48d9b52467b3ba496ac2e9f16300792516948a82ac8c"
DEST="$(cd "$(dirname "$0")/.." && pwd)/apps/web/public/runtimes/v86"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/build.sh" <<'INNER'
set -e
apk add --no-cache \
  bash git sqlite nasm gdb gcc musl-dev binutils libncursesw libexpat python3 sqlite-libs \
  findutils >/dev/null 2>&1
OUT=/out/devtools
rm -rf "$OUT" && mkdir -p "$OUT"

# Alpine's own package manifests already know exactly what each package
# needs at both link time (dev symlinks, crt objects, .a stubs) and run
# time (SONAME symlinks): reconstructing that by hand from ldd closures
# keeps missing files ldd never reports (Scrt1.o, libgcc_s.so, libc.so, the
# linker plugin collect2 always loads). Taking the packages whole, as
# Alpine's own toolchain does, is complete by construction.
PKGS="musl musl-utils libgcc libstdc++ gmp mpfr4 mpc1 isl26 zlib zstd-libs \
  binutils libctf jansson sframe gcc musl-dev \
  bash readline ncurses-terminfo-base libncursesw \
  git pcre2 \
  sqlite-libs \
  nasm \
  gdb libexpat python3 sqlite"
for p in $PKGS; do
  apk info -L "$p" 2>/dev/null | while read -r f; do
    [ -n "$f" ] || continue
    src="/$f"
    [ -e "$src" ] || continue
    [ -d "$src" ] && continue
    mkdir -p "$OUT/$(dirname "$f")"
    cp -d "$src" "$OUT/$f" 2>/dev/null || cp -L "$src" "$OUT/$f"
  done
done

# A package lists its own symlinks, not another package's file one of
# those symlinks points through: resolve every chain against the real
# filesystem (where every package above is actually installed) until no
# new target turns up.
resolved=0
while [ "$resolved" = "0" ]; do
  resolved=1
  for l in $(find "$OUT" -type l); do
    rel=${l#"$OUT"}
    abs=$(readlink -f "$rel" 2>/dev/null) || continue
    if [ -n "$abs" ] && [ ! -e "$OUT$abs" ] && [ -e "$abs" ]; then
      mkdir -p "$OUT$(dirname "$abs")"
      if [ -L "$abs" ]; then cp -d "$abs" "$OUT$abs"; else cp -L "$abs" "$OUT$abs"; fi
      resolved=0
    fi
  done
done

# The Buildroot image's own /lib/libgcc_s.so.1 is older than this gcc and
# missing symbols it expects (__cpu_model, __cpu_indicator_init), and the
# loader checks /lib before /usr/lib: ship ours there too, so extraction
# overwrites the stale one instead of merely being shadowed by it.
if [ -e "$OUT/usr/lib/libgcc_s.so.1" ]; then
  mkdir -p "$OUT/lib"
  cp "$OUT/usr/lib/libgcc_s.so.1" "$OUT/lib/libgcc_s.so.1"
fi

find "$OUT" -type f -exec strip --strip-unneeded {} \; 2>/dev/null
rm -rf "$OUT/usr/share/man" "$OUT/usr/share/doc" "$OUT/usr/share/bash-completion" \
       "$OUT/usr/share/git-core/templates/hooks" "$OUT/usr/lib/python3.12/test" \
       "$OUT/usr/lib/python3.12/idlelib" "$OUT/usr/lib/python3.12/tkinter" \
       "$OUT/usr/lib/python3.12/ensurepip" "$OUT/usr/lib/gcc"/*/*/plugin \
       "$OUT/usr/libexec/gcc"/*/*/lto1 "$OUT/usr/libexec/gcc"/*/*/lto-wrapper
find "$OUT" -name "__pycache__" -type d -prune -exec rm -rf {} + 2>/dev/null || true
find "$OUT" -name "*.pyc" -delete 2>/dev/null || true

# Binutils/gcc tools no lesson calls directly: lto-dump alone (an LTO
# object inspector a student never runs) is bigger than the rest of
# binutils put together. The cross-prefixed names (i586-alpine-linux-musl-*)
# duplicate a tool already present under its plain name; the git-* helpers
# removed below serve a remote push target, a restricted shell, or CVS -
# none of them a local, offline repo.
rm -f "$OUT/usr/bin/lto-dump" "$OUT/usr/bin/dwp" "$OUT/usr/bin/gcov" \
      "$OUT/usr/bin/gcov-dump" "$OUT/usr/bin/gcov-tool" "$OUT/usr/bin/cpp" \
      "$OUT/usr/bin"/i586-alpine-linux-musl-* \
      "$OUT/usr/bin/objdump" "$OUT/usr/bin/readelf" "$OUT/usr/bin/strings" \
      "$OUT/usr/bin/addr2line" "$OUT/usr/bin/size" "$OUT/usr/bin/elfedit" \
      "$OUT/usr/bin/c++filt" "$OUT/usr/bin/windres" "$OUT/usr/bin/dlltool" \
      "$OUT/usr/bin/windmc" "$OUT/usr/bin/nm" "$OUT/usr/bin/git-shell" \
      "$OUT/usr/bin/git-cvsserver" "$OUT/usr/bin/git-receive-pack" \
      "$OUT/usr/bin/git-upload-archive"
rm -rf "$OUT/usr/lib/gcc"/*/*/install-tools "$OUT/usr/libexec/gcc"/*/*/g++-mapper-server

du -sh "$OUT"
find "$OUT" -type f | wc -l
cd "$OUT" && tar --numeric-owner -cf /out/devtools.tar . && cd /
gzip -9 -f /out/devtools.tar
sha256sum /out/devtools.tar.gz
INNER

mkdir -p "$WORK/out"
docker run --rm --platform linux/386 \
  -v "$WORK/build.sh:/build.sh" \
  -v "$WORK/out:/out" \
  "$ALPINE_IMAGE" sh /build.sh

mkdir -p "$DEST"
cp "$WORK/out/devtools.tar.gz" "$DEST/devtools.tar.gz"
echo "devtools.tar.gz ready in ${DEST}"
sha256sum "$DEST/devtools.tar.gz"
