"""Crop the venue floor-plan photo into one image per level for the Taiwan page map.

    uv run --with pillow python scripts/make_venue_images.py            # write assets/venue/*.webp
    uv run --with pillow python scripts/make_venue_images.py --grid     # also write tmp/venue-grid/*.png
                                                                         # (coordinate grid, for placing pins)

Inputs : data-src/venue-floorplan.jpg   (photo of the on-site poster, no EXIF)
         data-src/venue.json            (per level: crop box + zones, in photo pixels)
Outputs: assets/venue/<level>.webp      (generated, do not edit by hand)

Pins and polygons are not drawn into the images: the page overlays them, so the
same crop serves every time of day.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


def repo_root() -> Path:
    p = Path(__file__).resolve()
    for parent in [p] + list(p.parents):
        if (parent / ".git").exists():
            return parent
    return p.parents[1]


ROOT = repo_root()
QUALITY = 80


def grid(img: Image.Image, origin: tuple[int, int], step: int = 25) -> Image.Image:
    """Overlay a labelled grid in *photo* coordinates (red = x, blue = y; labels every 100 px)."""
    g = img.copy()
    d = ImageDraw.Draw(g)
    x0, y0 = origin
    for gx in range((x0 // step + 1) * step, x0 + g.width, step):
        major = gx % 100 == 0
        d.line([(gx - x0, 0), (gx - x0, g.height)], fill=(255, 0, 0) if major else (255, 190, 190))
        if major:
            d.text((gx - x0 + 2, 2), str(gx), fill=(255, 0, 0))
    for gy in range((y0 // step + 1) * step, y0 + g.height, step):
        major = gy % 100 == 0
        d.line([(0, gy - y0), (g.width, gy - y0)], fill=(0, 0, 255) if major else (190, 190, 255))
        if major:
            d.text((2, gy - y0 + 2), str(gy), fill=(0, 0, 255))
    return g


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", action="store_true", help="also write coordinate-grid PNGs to tmp/venue-grid/")
    a = ap.parse_args()
    venue = json.loads((ROOT / "data-src/venue.json").read_text(encoding="utf-8"))
    photo = Image.open(ROOT / venue["source"]).convert("RGB")
    out = ROOT / "assets/venue"
    out.mkdir(parents=True, exist_ok=True)
    for lv in venue["levels"]:
        x0, y0, x1, y1 = lv["crop"]
        img = photo.crop((x0, y0, x1, y1))
        dest = out / f"{lv['id']}.webp"
        img.save(dest, "WEBP", quality=QUALITY, method=6)      # Pillow writes no EXIF unless asked
        print(f"{dest.relative_to(ROOT)}  {img.width}x{img.height}  {dest.stat().st_size // 1024} KB")
        if a.grid:
            gdir = ROOT / "tmp/venue-grid"
            gdir.mkdir(parents=True, exist_ok=True)
            grid(img, (x0, y0)).save(gdir / f"{lv['id']}.png")


if __name__ == "__main__":
    main()
