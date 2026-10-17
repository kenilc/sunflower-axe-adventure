"""Build the Tulip Polder cow in Blender and export it for the game.

From the repository root (see kit.py for the conventions):

    SUNFLOWER_EXPORT=1 SUNFLOWER_REPO=$PWD blender --background \\
      --factory-startup --python assets/blender/build_cow.py

A soft, rounded Dutch black-and-white cow. The `head` node pivots at the
neck, so turning it about X lowers the head to graze; the `tail` node
pivots at its root and swishes about Y.
"""

import math
import os
import sys

sys.path.insert(
    0,
    os.path.join(os.environ.get("SUNFLOWER_REPO", os.getcwd()), "assets", "blender"),
)
from kit import Parts, at, clear_scene, ellipsoid, empty, finish, frustum  # noqa: E402

PALETTE = {
    "coat": "#f3efe6",
    "patch": "#3a3532",
    "muzzle": "#e9b3a8",
    "hoof": "#4a3f38",
    "horn": "#efe6cf",
    "eye": "#1f1c1a",
}


def build():
    clear_scene()
    root = empty("cow")
    body = Parts("cow", PALETTE)

    # A round barrel of a body with black patches set into its sides.
    body.add("coat", ellipsoid(0.62, 1.08, 0.56), at(0, 0.05, 1.1))
    body.add("coat", ellipsoid(0.5, 0.45, 0.5), at(0, 0.75, 1.15))
    for x, y, z, sx, sy, sz in (
        (0.42, 0.25, 1.28, 0.26, 0.42, 0.3),
        (-0.45, -0.25, 1.1, 0.24, 0.36, 0.32),
        (-0.38, 0.62, 1.32, 0.22, 0.3, 0.24),
        (0.15, -0.5, 1.48, 0.28, 0.26, 0.16),
    ):
        body.add("patch", ellipsoid(sx, sy, sz), at(x, y, z))
    body.add("muzzle", ellipsoid(0.2, 0.22, 0.14), at(0, 0.62, 0.62))

    # Short legs, slightly splayed, on dark hooves.
    for x in (-0.32, 0.32):
        for y in (-0.62, 0.68):
            tilt = 0.06 if x > 0 else -0.06
            body.add("coat", frustum(0.15, 0.12, 0.62, sides=7), at(x, y, 0.16, ry=tilt))
            body.add("hoof", frustum(0.13, 0.13, 0.16, sides=7), at(x + tilt * 0.3, y, 0))
    body.objects("cow", root)

    # The head hangs from a neck pivot so it can dip to the grass.
    head = empty("head", root, (0, -0.92, 1.38))
    face = Parts("cow", PALETTE)
    face.add("coat", ellipsoid(0.3, 0.26, 0.28), at(0, -0.05, 0))
    face.add("coat", ellipsoid(0.27, 0.36, 0.25), at(0, -0.36, -0.12, rx=-0.35))
    face.add("patch", ellipsoid(0.13, 0.17, 0.12), at(0.15, -0.24, 0.1))
    face.add("muzzle", ellipsoid(0.24, 0.16, 0.18), at(0, -0.66, -0.24))
    for side in (-1, 1):
        face.add("eye", ellipsoid(0.045, 0.04, 0.05, 1), at(side * 0.2, -0.36, 0.05))
        face.add("patch", ellipsoid(0.16, 0.06, 0.09), at(side * 0.36, -0.05, 0.1, rz=side * 0.3))
        face.add(
            "horn",
            frustum(0.05, 0.015, 0.22, sides=6),
            at(side * 0.16, -0.02, 0.2, ry=side * 0.55),
        )
        face.add("eye", ellipsoid(0.025, 0.02, 0.02, 1), at(side * 0.08, -0.81, -0.2))
    face.objects("cow-head", head)

    # The tail hangs from the rump and ends in a dark tuft.
    tail = empty("tail", root, (0, 1.12, 1.35))
    switch = Parts("cow", PALETTE)
    switch.add("coat", frustum(0.04, 0.03, 0.75, sides=5, z=-0.75))
    switch.add("patch", ellipsoid(0.08, 0.08, 0.14, 1), at(0, 0, -0.82))
    switch.objects("cow-tail", tail)
    tail.rotation_euler = (math.radians(12), 0, 0)
    return root


cow = build()
finish(cow, "cow")
