#!/usr/bin/env python3
"""
V19-3: Generate placeholder PWA icons + favicon for apps/web/public/.

Before this script, apps/web/public/ did not exist, causing:
  - /favicon.ico → 404 on every page load
  - /icon-192.png → 404 (PWA manifest reference)
  - /icon-512.png → 404 (PWA manifest reference)
  - PWA install broken

This script generates minimal valid PNG files (solid Warm Mineral clay-500
#9E5E44 background) at 16x16, 192x192, and 512x512. They are placeholders —
the studio owner should replace them with branded assets later.
"""

import struct
import zlib
from pathlib import Path

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "apps" / "web" / "public"

# Warm Mineral clay-500 (#9E5E44) — primary brand color
R, G, B = 0x9E, 0x5E, 0x44


def make_png(width: int, height: int, r: int, g: int, b: int) -> bytes:
    """Generate a minimal solid-color PNG file."""

    def chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        crc = zlib.crc32(c) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + c + struct.pack(">I", crc)

    # PNG signature
    sig = b"\x89PNG\r\n\x1a\n"
    # IHDR: width, height, bit_depth=8, color_type=2 (RGB), compression=0, filter=0, interlace=0
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    # IDAT: raw pixel data (one filter byte 0 per row, then RGB triples)
    raw = bytearray()
    for _ in range(height):
        raw.append(0)  # filter type 0 (None)
        raw.extend([r, g, b] * width)
    idat = zlib.compress(bytes(raw))
    # IEND
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def make_ico(sizes: list[int], r: int, g: int, b: int) -> bytes:
    """Generate a multi-resolution .ico file containing the given PNG sizes."""
    pngs = [make_png(s, s, r, g, b) for s in sizes]
    # ICO header: 6 bytes (reserved=0, type=1, count=n)
    header = struct.pack("<HHH", 0, 1, len(pngs))
    # Each directory entry: 16 bytes
    entries = b""
    # Image data starts after header (6) + entries (16 * n)
    data_offset = 6 + 16 * len(pngs)
    images = b""
    for i, (size, png) in enumerate(zip(sizes, pngs)):
        # icon entry: width(1), height(1), colors(1)=0, reserved(1)=0, planes(2)=1, bpp(2)=32, size(4), offset(4)
        w = 0 if size == 256 else size
        h = 0 if size == 256 else size
        entry = struct.pack(
            "<BBBBHHII", w, h, 0, 0, 1, 32, len(png), data_offset + len(images)
        )
        entries += entry
        images += png
    return header + entries + images


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    # favicon.ico (multi-resolution: 16, 32, 48)
    ico = make_ico([16, 32, 48], R, G, B)
    (PUBLIC_DIR / "favicon.ico").write_bytes(ico)
    print(f"  ✓ favicon.ico ({len(ico)} bytes)")

    # icon-192.png
    png192 = make_png(192, 192, R, G, B)
    (PUBLIC_DIR / "icon-192.png").write_bytes(png192)
    print(f"  ✓ icon-192.png ({len(png192)} bytes)")

    # icon-512.png
    png512 = make_png(512, 512, R, G, B)
    (PUBLIC_DIR / "icon-512.png").write_bytes(png512)
    print(f"  ✓ icon-512.png ({len(png512)} bytes)")

    # apple-icon.png (180x180 — Apple touch icon)
    png180 = make_png(180, 180, R, G, B)
    (PUBLIC_DIR / "apple-icon.png").write_bytes(png180)
    print(f"  ✓ apple-icon.png ({len(png180)} bytes)")

    print(f"\nAll assets written to {PUBLIC_DIR}")


if __name__ == "__main__":
    main()
