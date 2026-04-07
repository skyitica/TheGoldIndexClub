#!/usr/bin/env python3
"""
Crop tall win screenshots to ~16:10, top-aligned like *_topcrop_*.png assets:
find the first strong blue row (MT-style profit) and start the crop slightly above it.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image


def find_crop_y(px, w: int, h: int) -> int:
    """First row in upper third that looks like blue PnL text; crop starts just above it."""
    x0 = int(w * 0.12)
    x1 = int(w * 0.88)
    step = max(1, (x1 - x0) // 50)
    search_top = int(h * 0.03)
    search_bot = int(h * 0.34)
    margin_above_blue = 14

    for y in range(search_top, search_bot):
        blues = 0
        n = 0
        for x in range(x0, x1, step):
            r, g, b = px[x, y][:3]
            if b > 90 and b > r + 18 and (b - g) > -15:
                blues += 1
            n += 1
        if n and blues / n > 0.06:
            return max(0, y - margin_above_blue)

    # Status-bar / nonstandard UI: small skip then top window
    return int(h * 0.048)


def crop_like_topcrop(src: Path, dry_run: bool = False) -> tuple[int, int] | None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    px = im.load()
    if not px:
        return None

    # Match existing topcrop aspect (~16:10)
    crop_h = max(1, int(round(w * 10.0 / 16.0)))
    y0 = find_crop_y(px, w, h)
    if y0 + crop_h > h:
        y0 = max(0, h - crop_h)
    y1 = y0 + crop_h
    cropped = im.crop((0, y0, w, y1))
    if not dry_run:
        cropped.save(src, "PNG", optimize=True)
    return cropped.size


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    assets = root / "assets"
    files = [
        assets / "win-new-1.png",
        assets / "win-new-2.png",
        assets / "win-new-3.png",
        assets / "win-place-3-us30.png",
    ]
    for p in files:
        if not p.is_file():
            print(f"skip (missing): {p.name}")
            continue
        out = crop_like_topcrop(p)
        print(f"{p.name} -> {out}")


if __name__ == "__main__":
    main()
