/**
 * A real C and assembly toolchain for the machine: bash, git, sqlite3, nasm,
 * gcc, gdb, python3, opt-in and extracted over LESSON_DIR once the machine
 * is up (public/runtimes/v86/devtools.tar.gz, built by
 * scripts/build-devtools-runtime.sh - see RUNTIMES_VERSIONS.md for what is
 * in it, what was left out, and the one thing gdb cannot do here).
 *
 * The Buildroot image's own kernel and BusyBox never change: a lesson that
 * does not ask for this pays nothing extra, and nothing about how the other
 * 50-odd Linux lessons boot moves.
 */

import { LESSON_DIR } from "./session";

/** Guest memory for a plain lesson - unchanged, what every machine already uses. */
export const BASE_MEMORY_SIZE = 64 * 1024 * 1024;

/**
 * Guest memory once the toolchain is extracted (~115 MB installed): a
 * machine that asked for it gets this from the start, since v86 cannot grow
 * memory_size after boot.
 */
export const DEVTOOLS_MEMORY_SIZE = 256 * 1024 * 1024;

/** The archive's name in the 9p share, relative to LESSON_DIR like .bash already is. */
export const DEVTOOLS_FILE = ".devtools.tar";

/**
 * Raised well past the ~115 MB the archive unpacks to: headroom for the
 * learner's own compiles, object files, and a repository or two.
 */
const TMPFS_SIZE = "200m";

/**
 * Unpacks the toolchain over /: the archive is shipped gzip-compressed but
 * reaches the machine already decompressed (DecompressionStream, in the
 * page) because this image's BusyBox tar has no -z at all - its own --help
 * does not list one, and it refuses the file outright. --strip-components=1
 * drops the leading "./" every entry carries, from how
 * build-devtools-runtime.sh tars the tree (`tar -cf devtools.tar .`, run
 * from inside it): without it, tar would read "." as the first path
 * component and nothing would land where it should.
 */
export function installDevtoolsCommand(): string {
  return [
    `mount -o remount,size=${TMPFS_SIZE} /`,
    `tar xf ${LESSON_DIR}/${DEVTOOLS_FILE} -C / --strip-components=1`,
    `rm -f ${LESSON_DIR}/${DEVTOOLS_FILE}`,
  ].join("; ");
}
