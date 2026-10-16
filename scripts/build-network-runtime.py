#!/usr/bin/env python3
"""Build the opt-in SSH guest archive from checksum-pinned Alpine x86 packages."""
import gzip
import hashlib
import io
from pathlib import Path
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "apps/web/public/runtimes/v86"
PACKAGES = {
    "dropbear-2024.85-r0.apk": "8d98986c24b70c97a7ebc2a4d44f553b0d6e2cf94c5d76729103fba8011819a1",
    "dropbear-dbclient-2024.85-r0.apk": "2817cb4ed1c8356530a3b0f7bbd03021c2e827bcdc14783dc90e0f82feb121fd",
    "musl-1.2.5-r3.apk": "7e56fb578429d6c493c3cc07a7390635a5d76dcc6e38c74fbec9279b2d68ab63",
    "zlib-1.3.2-r0.apk": "5a13ff9246bb9f1043c588a5e686f303f68545d816d56deb2ca0ff86e6540382",
}
FILES = {
    "usr/bin/dbclient", "usr/bin/dropbearkey", "usr/sbin/dropbear",
    "lib/ld-musl-i386.so.1", "lib/libc.musl-x86.so.1",
    "lib/libz.so.1", "lib/libz.so.1.3.2",
}


def fetch_apk(name: str) -> bytes:
    cached = ROOT / ".tmp-network-runtime" / name
    if cached.exists():
        return cached.read_bytes()
    url = f"https://dl-cdn.alpinelinux.org/alpine/v3.20/main/x86/{name}"
    return urllib.request.urlopen(url, timeout=60).read()  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected


def build():
    entries = {}
    for name, expected in PACKAGES.items():
        data = fetch_apk(name)
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError(f"Checksum mismatch: {name}")
        # APK v2 concatenates signature, control and data tar/gzip streams.
        with tarfile.open(fileobj=io.BytesIO(gzip.decompress(data)), ignore_zeros=True) as package:
            for member in package.getmembers():
                if member.name not in FILES:
                    continue
                if member.isfile():
                    source = package.extractfile(member)
                    if source is None:
                        raise ValueError(member.name)
                    entries[member.name] = (member, source.read())
                elif member.issym() and member.linkname in {"ld-musl-i386.so.1", "libz.so.1.3.2"}:
                    entries[member.name] = (member, b"")
                else:
                    raise ValueError(f"Unexpected entry: {member.name}")
    if entries.keys() != FILES:
        raise ValueError("Incomplete SSH runtime")
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for name, (member, data) in sorted(entries.items()):
            item = tarfile.TarInfo(name)
            item.mode = member.mode
            item.type = member.type
            item.linkname = member.linkname
            item.size = len(data)
            archive.addfile(item, io.BytesIO(data))
    data = gzip.compress(output.getvalue(), mtime=0)
    target = DEST / "network-tools.tar.gz"
    target.write_bytes(data)
    print(f"{target.name}: {len(data)} bytes, sha256 {hashlib.sha256(data).hexdigest()}")


if __name__ == "__main__":
    build()
