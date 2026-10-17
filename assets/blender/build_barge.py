"""Build the canal barge that carries the friends between Tulip Polder and
Lavender Hills, and export it for the game.

From the repository root (see kit.py for the conventions):

    SUNFLOWER_EXPORT=1 SUNFLOWER_REPO=$PWD blender --background \\
      --factory-startup --python assets/blender/build_barge.py

A small Dutch flower barge: a green hull with a pointed bow, crates of
tulips amidships and a bench at the bow where the friends sit. Its origin is
on the waterline; the bench seat is 0.75 up and 1.9 ahead of the middle
(BARGE in src/locations/lavender/barge.js must match).
"""

import math
import os
import sys

sys.path.insert(
    0,
    os.path.join(os.environ.get("SUNFLOWER_REPO", os.getcwd()), "assets", "blender"),
)
from kit import (  # noqa: E402
    Parts,
    at,
    clear_scene,
    cuboid,
    ellipsoid,
    empty,
    finish,
    frustum,
)

PALETTE = {
    "hull": "#2f5f4a",
    "band": "#c8573f",
    "trim": "#f4efe2",
    "deck": "#a7804f",
    "crate": "#8a6a4c",
    "red": "#e2453c",
    "yellow": "#f5c842",
    "pink": "#f08fb0",
    "white": "#f6f0e4",
    "leaf": "#4f7f3a",
    "dark": "#3b2e26",
    "window": "#f2cf86",
}

# The hull's plan from above, stern (+Y) to the pointed bow (-Y).
OUTLINE = [
    (-0.95, 3.0),
    (0.95, 3.0),
    (1.0, -1.6),
    (0.62, -2.75),
    (0.0, -3.3),
    (-0.62, -2.75),
    (-1.0, -1.6),
]


def prism(outline, bottom, top, shrink=1.0):
    """A solid from an outline at `top`, narrowing by `shrink` at `bottom`."""

    def build(bm):
        low = [bm.verts.new((x * shrink, y * (0.5 + shrink / 2), bottom)) for x, y in outline]
        high = [bm.verts.new((x, y, top)) for x, y in outline]
        bm.faces.new(list(reversed(low)))
        bm.faces.new(high)
        count = len(outline)
        for i in range(count):
            j = (i + 1) % count
            bm.faces.new((low[i], low[j], high[j], high[i]))

    return build


def build():
    clear_scene()
    root = empty("barge")
    boat = Parts("barge", PALETTE)
    # Hull below and above the waterline, a red band and a cream gunwale.
    boat.add("hull", prism(OUTLINE, -0.45, 0.35, shrink=0.78))
    boat.add("band", prism([(x * 1.01, y * 1.005) for x, y in OUTLINE], 0.35, 0.5))
    boat.add("trim", prism([(x * 1.03, y * 1.01) for x, y in OUTLINE], 0.5, 0.58))
    boat.add("deck", prism([(x * 0.9, y * 0.95) for x, y in OUTLINE], 0.4, 0.6))

    # Crates of tulips amidships, two deep.
    colours = ("red", "yellow", "pink", "white", "red", "yellow")
    for k, (x, y) in enumerate(
        (x, y) for y in (0.1, 0.85, 1.6) for x in (-0.42, 0.42)
    ):
        boat.add("crate", cuboid(0.72, 0.62, 0.36), at(x, y, 0.78))
        for i in range(6):
            bx = x - 0.24 + (i % 3) * 0.24
            by = y - 0.14 + (i // 3) * 0.28
            boat.add("leaf", ellipsoid(0.1, 0.1, 0.05, 1), at(bx, by, 0.98))
            boat.add(colours[(k + i) % len(colours)], frustum(0.06, 0.08, 0.12, sides=6, z=1.0), at(bx, by, 0))

    # A little wheelhouse at the stern with a lit window and a tiller.
    boat.add("trim", cuboid(1.3, 0.9, 0.9), at(0, 2.45, 1.05))
    boat.add("band", cuboid(1.45, 1.05, 0.12), at(0, 2.45, 1.56))
    for side in (-1, 1):
        boat.add("window", cuboid(0.04, 0.5, 0.35), at(side * 0.66, 2.45, 1.15))
    boat.add("dark", cuboid(0.08, 0.9, 0.08), at(0, 3.25, 0.85, rx=0.5))

    # The bench at the bow for two.
    boat.add("deck", cuboid(1.3, 0.42, 0.1), at(0, -1.9, 0.75))
    boat.add("deck", cuboid(1.3, 0.08, 0.45), at(0, -1.67, 0.98))
    for side in (-1, 1):
        boat.add("dark", cuboid(0.08, 0.36, 0.17), at(side * 0.55, -1.9, 0.66))
    # A pennant on a short mast at the bow.
    boat.add("dark", frustum(0.03, 0.025, 1.4, sides=6, z=0.58), at(0, -2.75, 0))
    boat.add("band", cuboid(0.02, 0.5, 0.25), at(0, -2.98, 1.8))
    boat.objects("barge", root)
    return root


barge = build()
finish(barge, "barge")
