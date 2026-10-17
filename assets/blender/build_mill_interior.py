"""Build the inside of the Tulip Polder windmill and export it for the game.

From the repository root (see kit.py for the conventions):

    SUNFLOWER_EXPORT=1 SUNFLOWER_REPO=$PWD blender --background \\
      --factory-startup --python assets/blender/build_mill_interior.py

An octagonal milling floor, open at the front like a dollhouse so the camera
can look in. The millstones sit on a timber platform in the middle; the
`runner` node (the upper stone) and the `gears` node (the upright shaft and
crown wheel) turn about the vertical axis: Blender's Z, which is Y in the
game.
The game's room layout in src/locations/polder/mill.js must match the
positions here: the platform at the centre, the ladder at the back and the
doorway at the front.
"""

import math
import os
import sys

from mathutils import Matrix

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
    "floor": "#b08a62",
    "plank": "#9c7752",
    "brick": "#b65a43",
    "timber": "#8d6e4f",
    "beam": "#6b4f38",
    "stone": "#aaa49b",
    "groove": "#7d776f",
    "sack": "#ece0c6",
    "flour": "#f7f3ea",
    "window": "#f2cf86",
    "trim": "#f4efe2",
    "iron": "#4b4744",
    "bread": "#d4a164",
}
RADIUS = 7.4  # outer radius of the octagon
HEIGHT = 5.6


def build():
    clear_scene()
    root = empty("mill_interior")
    room = Parts("mill", PALETTE)

    # Plank floor.
    room.add("floor", frustum(RADIUS, RADIUS, 0.2, z=-0.2))
    for i in range(-6, 7):
        x = i * 1.05
        # Stay inside the octagon: its inner circle bounds each seam.
        length = 2 * math.sqrt((RADIUS * 0.9) ** 2 - x * x)
        room.add("plank", cuboid(0.05, length, 0.01), at(x, 0, 0.005))

    # Eight walls: the five at the back rise to the beams; the three at the
    # front stop at knee height, with the doorway in the middle one.
    apothem = RADIUS * math.cos(math.pi / 8) - 0.2
    width = 2 * RADIUS * math.sin(math.pi / 8) + 0.1
    for i in range(8):
        angle = -math.pi / 2 + i * math.tau / 8  # i = 0 faces the front (-Y)
        x, y = math.cos(angle) * apothem, math.sin(angle) * apothem
        turn = angle + math.pi / 2
        front = i in (0, 1, 7)
        if front:
            if i == 0:
                for side in (-1, 1):
                    piece = (width - 2.4) / 2
                    offset = side * (1.2 + piece / 2)
                    room.add("brick", cuboid(piece, 0.4, 0.7), at(x + offset, y, 0.35, rz=turn))
            else:
                room.add("brick", cuboid(width, 0.4, 0.7), at(x, y, 0.35, rz=turn))
                room.add("trim", cuboid(width, 0.5, 0.08), at(x, y, 0.74, rz=turn))
            continue
        room.add("brick", cuboid(width, 0.4, 2.2), at(x, y, 1.1, rz=turn))
        room.add("timber", cuboid(width, 0.36, HEIGHT - 2.2), at(x, y, 2.2 + (HEIGHT - 2.2) / 2, rz=turn))
        room.add("trim", cuboid(width, 0.46, 0.1), at(x, y, 2.2, rz=turn))
        if i in (2, 6, 4):
            room.add("window", cuboid(0.9, 0.42, 1.1), at(x, y, 3.4, rz=turn))
            room.add("trim", cuboid(1.1, 0.46, 0.1), at(x, y, 4.0, rz=turn))
    # Corner posts and ceiling beams over the back half.
    for i in range(8):
        angle = -math.pi / 2 + (i + 0.5) * math.tau / 8
        if i in (0, 7):
            continue
        x, y = math.cos(angle) * (RADIUS - 0.35), math.sin(angle) * (RADIUS - 0.35)
        room.add("beam", cuboid(0.3, 0.3, HEIGHT), at(x, y, HEIGHT / 2))
    for y in (1.2, 3.6, 5.6):
        room.add("beam", cuboid(2 * RADIUS * 0.9, 0.32, 0.36), at(0, y, HEIGHT - 0.2))

    # The hurst: a timber platform carrying the stones, with a flour chute
    # running down to a sack at the front right.
    room.add("timber", frustum(2.1, 2.1, 0.9, z=0))
    room.add("trim", frustum(2.16, 2.16, 0.08, z=0.88))
    room.add("stone", frustum(1.45, 1.45, 0.3, sides=16, z=0.95))
    chute = Matrix.Rotation(-0.5, 4, "X")
    room.add("timber", cuboid(0.3, 1.5, 0.22), at(1.2, -2.1, 0.75) @ chute)
    room.add("sack", ellipsoid(0.45, 0.42, 0.55), at(1.25, -2.85, 0.5))
    room.add("flour", ellipsoid(0.32, 0.3, 0.08), at(1.25, -2.85, 1.02))

    # Hopper above the stones on a little frame.
    room.add("timber", frustum(0.22, 0.75, 0.8, sides=4, z=2.05))
    for side in (-1, 1):
        room.add("beam", cuboid(0.14, 0.14, 2.9), at(side * 1.25, 0, 1.4 + 1.45))
    room.add("beam", cuboid(2.64, 0.14, 0.14), at(0, 0, 2.95))

    # Sacks against the walls, a workbench with loaves and a scale.
    for x, y, n in ((-5.0, 2.6, 3), (4.9, 2.9, 4), (-2.2, 5.6, 2)):
        for k in range(n):
            room.add(
                "sack",
                ellipsoid(0.42, 0.38, 0.55),
                at(x + (k % 2) * 0.75 - 0.35, y + (k // 2) * 0.6, 0.55, rz=k * 0.7),
            )
    room.add("timber", cuboid(2.4, 1.0, 0.12), at(-4.4, -1.2, 1.05))
    for dx in (-1.05, 1.05):
        for dy in (-0.4, 0.4):
            room.add("beam", cuboid(0.12, 0.12, 1.0), at(-4.4 + dx, -1.2 + dy, 0.5))
    for k in range(3):
        room.add("bread", ellipsoid(0.26, 0.17, 0.13), at(-5.0 + k * 0.6, -1.2, 1.22, rz=k))
    room.add("iron", frustum(0.06, 0.06, 0.55, sides=6, z=1.1), at(-3.6, -1.2, 0))
    room.add("iron", cuboid(0.7, 0.04, 0.04), at(-3.6, -1.2, 1.65))

    # A ladder at the back climbs to a bright hatch: the way up to the stage.
    for side in (-1, 1):
        room.add("beam", cuboid(0.12, 0.12, HEIGHT + 0.3), at(side * 0.45, 6.15, HEIGHT / 2 - 0.1, rx=-0.12))
    for k in range(13):
        z = 0.35 + k * 0.42
        room.add("timber", cuboid(0.9, 0.08, 0.08), at(0, 6.15 + (z - HEIGHT / 2) * 0.12, z))
    room.add("window", cuboid(1.4, 1.2, 0.08), at(0, 6.4, HEIGHT + 0.02))
    room.objects("mill", root)

    # The upper millstone turns on the spindle.
    runner = empty("runner", root, (0, 0, 1.25))
    stone = Parts("mill", PALETTE)
    stone.add("stone", frustum(1.42, 1.42, 0.32, sides=16, z=0))
    stone.add("groove", frustum(1.43, 1.43, 0.05, sides=16, z=0.12))
    stone.add("groove", frustum(0.3, 0.3, 0.02, sides=10, z=0.32))
    stone.add("iron", cuboid(1.9, 0.12, 0.05), at(0, 0, 0.34))
    stone.objects("mill-runner", runner)

    # The upright shaft and the big crown wheel under the beams.
    gears = empty("gears", root, (0, 0, 0))
    wheel = Parts("mill", PALETTE)
    wheel.add("beam", frustum(0.2, 0.2, HEIGHT - 2.9, z=2.9))
    wheel.add("timber", frustum(1.8, 1.8, 0.22, sides=16, z=4.3))
    wheel.add("beam", frustum(1.25, 1.25, 0.24, sides=16, z=4.29))
    for k in range(4):
        wheel.add("beam", cuboid(3.4, 0.16, 0.14), at(0, 0, 4.42, rz=k * math.pi / 4))
    for k in range(20):
        angle = k * math.tau / 20
        wheel.add(
            "iron",
            cuboid(0.16, 0.22, 0.24),
            at(math.cos(angle) * 1.68, math.sin(angle) * 1.68, 4.62, rz=angle),
        )
    wheel.objects("mill-gears", gears)
    return root


interior = build()
finish(interior, "mill_interior")
