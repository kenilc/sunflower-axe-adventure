"""Build the striped hot-air balloon that flies between the polder and the
misty forest, and export it for the game.

From the repository root (see kit.py for the conventions):

    SUNFLOWER_EXPORT=1 SUNFLOWER_REPO=$PWD blender --background \\
      --factory-startup --python assets/blender/build_balloon.py

The basket stands on the ground at the origin; the envelope, in gores of
alternating colour, rises about 9.5 above it. The `envelope` node can sway.
"""

import math
import os
import sys

sys.path.insert(
    0,
    os.path.join(os.environ.get("SUNFLOWER_REPO", os.getcwd()), "assets", "blender"),
)
from kit import Parts, at, clear_scene, cuboid, empty, finish, frustum  # noqa: E402

PALETTE = {
    "red": "#d98a80",
    "yellow": "#ecd58a",
    "cream": "#f4efe2",
    "blue": "#8aa9c6",
    "wicker": "#b08a5a",
    "rim": "#7a5a3e",
    "rope": "#d8c69a",
    "iron": "#4b4744",
    "flame": "#f2a33a",
}
GORES = 12
BASE = 4.4  # the envelope's mouth, above the ground


def profile(t):
    """Envelope radius and height for t from 0 (mouth) to 1 (crown)."""
    # A teardrop: narrow mouth, wide shoulders, rounded crown.
    angle = t * math.pi
    radius = 0.55 + 2.75 * math.sin(angle * 0.92) ** 1.2
    height = BASE + 5.4 * (1 - math.cos(angle)) / 2 + 0.6 * t
    return radius, height


def gore(index, rings=10):
    """One vertical panel of the envelope."""

    def build(bm):
        a0 = index * math.tau / GORES
        a1 = (index + 1) * math.tau / GORES
        rows = []
        for k in range(rings + 1):
            r, h = profile(k / rings)
            rows.append(
                [
                    bm.verts.new((math.cos(a) * r, math.sin(a) * r, h))
                    for a in (a0, a1)
                ]
            )
        for k in range(rings):
            (a, b), (c, d) = rows[k], rows[k + 1]
            bm.faces.new((a, b, d, c))

    return build


def build():
    clear_scene()
    root = empty("balloon")
    basket = Parts("balloon", PALETTE)
    # The wicker basket with a leather rim, and the burner frame above.
    basket.add("wicker", cuboid(1.5, 1.5, 1.05), at(0, 0, 0.53))
    basket.add("rim", frustum(1.12, 1.12, 0.12, sides=4, z=1.02))
    for x in (-0.68, 0.68):
        for y in (-0.68, 0.68):
            basket.add("iron", cuboid(0.05, 0.05, 1.6), at(x, y, 1.85))
    basket.add("iron", frustum(0.32, 0.32, 0.3, sides=8, z=2.5))
    basket.add("flame", frustum(0.18, 0.02, 0.5, sides=6, z=2.8))
    basket.objects("balloon-basket", root)

    envelope = empty("envelope", root, (0, 0, 0))
    skin = Parts("balloon", PALETTE)
    colours = ("red", "cream", "yellow", "cream", "blue", "cream")
    for i in range(GORES):
        skin.add(colours[i % len(colours)], gore(i))
    # A crown cap and the ropes down to the burner frame.
    r, h = profile(1)
    skin.add("red", frustum(r + 0.05, 0.05, 0.3, sides=GORES, z=h - 0.05))
    mouth, mouth_h = profile(0)
    for i in range(8):
        a = i * math.tau / 8
        top = (math.cos(a) * mouth, math.sin(a) * mouth, mouth_h)
        bottom = (math.cos(a) * 0.68, math.sin(a) * 0.68, 2.65)
        dx, dy, dz = (top[n] - bottom[n] for n in range(3))
        length = math.sqrt(dx * dx + dy * dy + dz * dz)
        tilt = math.acos(dz / length)
        heading = math.atan2(dy, dx)
        skin.add(
            "rope",
            cuboid(0.035, 0.035, length),
            at(
                (top[0] + bottom[0]) / 2,
                (top[1] + bottom[1]) / 2,
                (top[2] + bottom[2]) / 2,
                rz=heading,
                ry=tilt,
            ),
        )
    skin.objects("balloon-envelope", envelope)
    return root


balloon = build()
finish(balloon, "balloon")
