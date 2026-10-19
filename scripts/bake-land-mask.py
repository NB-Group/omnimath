#!/usr/bin/env python3
"""Regenerate src/lib/landMask.ts from public/earth-map.png.

The globe samples an 81-row latitude grid, one bit per dot column, MSB first.
Run from the repo root with the project's Python environment:

    python scripts/bake-land-mask.py
"""
from __future__ import annotations

import base64
import math
import textwrap
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MAP = ROOT / "public" / "earth-map.png"
OUT = ROOT / "src" / "lib" / "landMask.ts"
ROWS = 80
MAX_COLUMNS = 160

image = Image.open(MAP).convert("RGB")
width, height = image.size
bits: list[int] = []
for row in range(ROWS + 1):
    lat = -90 + (row / ROWS) * 180
    lat_rad = math.radians(lat)
    columns = max(1, round(MAX_COLUMNS * math.cos(lat_rad)))
    offset = (row % 2) * 0.5
    for column in range(columns):
        lon = ((column + offset) / columns) * 360 - 180
        u = (lon + 180) / 360
        v = (90 - lat) / 180
        px = min(width - 1, max(0, round(u * (width - 1))))
        py = min(height - 1, max(0, round(v * (height - 1))))
        r, g, b = image.getpixel((px, py))
        bits.append(1 if (g > 110 and g > b + 35 and g > r + 20) else 0)

packed = bytes(
    int("".join(str(bit) for bit in bits[i : i + 8]).ljust(8, "0"), 2)
    for i in range(0, len(bits), 8)
)
encoded = base64.b64encode(packed).decode()
body = "\n".join(f"  '{line}'," for line in textwrap.wrap(encoded, 100))
OUT.write_text(
    f"""// Land mask for the hero globe, baked from public/earth-map.png.
//
// The dot lattice samples an 81-row latitude grid; each row stores one bit per
// column, MSB first, packed across the whole grid. Baking it removes the only
// runtime dependency the globe had on an image fetch: a failed earth-map.png
// used to leave the globe as a featureless blue sphere.
//
// Regenerate with scripts/bake-land-mask.py if the source map changes.
export const LAND_MASK_BASE64 = [
{body}
].join('')

export const LAND_MASK_ROWS = {ROWS + 1}
export const LAND_MASK_MAX_COLUMNS = {MAX_COLUMNS}

let cached: Uint8Array | null = null

export function decodeLandMask(): Uint8Array {{
  if (cached) return cached
  const binary = atob(LAND_MASK_BASE64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {{
    bytes[index] = binary.charCodeAt(index)
  }}
  cached = bytes
  return bytes
}}
"""
)
print(f"wrote {OUT} ({len(packed)} packed bytes, {sum(bits)} land dots)")
