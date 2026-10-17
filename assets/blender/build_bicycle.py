"""Build the Tulip Polder bicycle in Blender and export it for the game.

From the repository root (see kit.py for the conventions):

    SUNFLOWER_EXPORT=1 SUNFLOWER_REPO=$PWD blender --background \\
      --factory-startup --python assets/blender/build_bicycle.py

A Dutch step-through city bike, sized for the friends: the saddle top is
0.98 up and 0.22 behind the pedals, the grips 0.3 in front of the pedals at
1.28, and the pedals turn 0.35 up. The game reads these from BICYCLE in
src/locations/polder/bikes.js. The `front_wheel`, `rear_wheel` and `crank`
nodes turn about X; meshes named `bicycle-frame` can be recoloured, and the
`basket` node can be hidden.
"""

import math
import os
import sys

from mathutils import Matrix, Vector

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
    torus,
)

PALETTE = {
    "frame": "#8cc7b0",
    "tyre": "#2f2f2f",
    "metal": "#c9c9c4",
    "guard": "#f4efe2",
    "saddle": "#6b4a2a",
    "wicker": "#b08a5a",
    "grip": "#3b2e26",
    "lamp": "#f2cf86",
    "red": "#e2453c",
    "yellow": "#f5c842",
    "pink": "#f08fb0",
    "leaf": "#5d8a40",
}
WHEEL = 0.4  # wheel radius, also the axle height
FRONT, REAR = -0.7, 0.65  # axle positions along Y (-Y is the front)
PEDALS = (0.0, 0.35)  # bottom bracket (y, z)


def tube(parts, key, a, b, thickness=0.06):
    """A square tube between two (y, z) points in the bike's middle plane."""
    a, b = Vector((0, *a)), Vector((0, *b))
    direction = b - a
    tilt = math.atan2(-direction.y, direction.z)
    parts.add(
        key,
        cuboid(thickness, thickness, direction.length + thickness),
        Matrix.Translation((a + b) / 2) @ Matrix.Rotation(tilt, 4, "X"),
    )


def wheel(name, root, y):
    node = empty(name, root, (0, y, WHEEL))
    parts = Parts("bicycle", PALETTE)
    turn = Matrix.Rotation(math.pi / 2, 4, "Y")

    parts.add("tyre", torus(WHEEL - 0.04, 0.045), turn)
    parts.add("metal", torus(WHEEL - 0.1, 0.02), turn)
    for k in range(8):
        parts.add(
            "metal",
            cuboid(0.015, 0.015, 2 * (WHEEL - 0.08)),
            Matrix.Rotation(k * math.pi / 8, 4, "X"),
        )
    parts.add("metal", frustum(0.05, 0.05, 0.12, sides=8, z=-0.06), turn)
    parts.objects(name, node)
    return node


def build():
    clear_scene()
    root = empty("bicycle")
    frame = Parts("bicycle", PALETTE)
    by, bz = PEDALS
    head_top, head_bottom = (-0.5, 1.05), (-0.56, 0.82)
    seat_top = (0.18, 0.9)

    # The step-through frame: a low curved down tube, the seat tube, stays
    # to the rear axle and a fork to the front.
    tube(frame, "frame", head_bottom, (-0.25, 0.44))
    tube(frame, "frame", (-0.25, 0.44), (by, bz))
    tube(frame, "frame", (by, bz), seat_top)
    tube(frame, "frame", head_top, head_bottom, 0.08)
    tube(frame, "frame", (by, bz), (REAR, WHEEL), 0.045)
    tube(frame, "frame", seat_top, (REAR, WHEEL), 0.045)
    tube(frame, "frame", head_bottom, (FRONT, WHEEL), 0.05)
    # A chain guard over the right of the chain.
    frame.add("frame", cuboid(0.03, REAR - by + 0.1, 0.13), at(0.07, (by + REAR) / 2, (bz + WHEEL) / 2))
    frame.objects("bicycle", root)

    fittings = Parts("bicycle", PALETTE)
    # Mudguards arcing over both wheels.
    for y in (FRONT, REAR):
        # Short pieces laid along the arc, each tangent to the wheel.
        for k in range(11):
            a = math.radians(20 + k * 14)
            fittings.add(
                "guard",
                cuboid(0.11, 0.13, 0.025),
                at(0, y + math.cos(a) * (WHEEL + 0.05), WHEEL + math.sin(a) * (WHEEL + 0.05), rx=a + math.pi / 2),
            )
    # A rear rack.
    fittings.add("metal", cuboid(0.28, 0.45, 0.03), at(0, REAR - 0.05, 0.93))
    tube(fittings, "metal", (REAR + 0.15, 0.93), (REAR, WHEEL), 0.025)
    # Saddle on its post.
    tube(fittings, "metal", seat_top, (0.22, 0.95), 0.04)
    fittings.add("saddle", ellipsoid(0.13, 0.17, 0.05), at(0, 0.22, 0.98))
    # Stem and swept-back handlebars with grips, a lamp and a bell.
    tube(fittings, "metal", head_top, (-0.48, 1.24), 0.04)
    for side in (-1, 1):
        fittings.add("metal", cuboid(0.34, 0.035, 0.035), at(side * 0.15, -0.46, 1.25, rz=side * 0.35))
        fittings.add("grip", frustum(0.035, 0.035, 0.14, sides=6), at(side * 0.32, -0.32, 1.28, ry=math.pi / 2) @ Matrix.Translation((0, 0, -0.07)))
    fittings.add("lamp", frustum(0.06, 0.07, 0.09, sides=8), at(0, -0.62, 0.98, rx=math.pi / 2))
    fittings.add("metal", frustum(0.04, 0.03, 0.03, sides=8), at(0.12, -0.44, 1.28))
    fittings.objects("bicycle-fittings", root)

    # A wicker basket of tulips on the front.
    basket = empty("basket", root, (0, -0.8, 1.02))
    weave = Parts("bicycle", PALETTE)
    weave.add("wicker", frustum(0.2, 0.24, 0.26, sides=8))
    for k, key in enumerate(("red", "yellow", "pink", "red", "yellow")):
        a = k * math.tau / 5
        weave.add("leaf", frustum(0.012, 0.012, 0.3, sides=4, z=0.05), at(math.cos(a) * 0.08, math.sin(a) * 0.08, 0))
        weave.add(key, frustum(0.04, 0.06, 0.08, sides=6, z=0.33), at(math.cos(a) * 0.08, math.sin(a) * 0.08, 0))
    weave.objects("bicycle-basket", basket)

    wheel("front_wheel", root, FRONT)
    wheel("rear_wheel", root, REAR)

    # The pedals and cranks turn together at the bottom bracket.
    crank = empty("crank", root, (0, by, bz))
    pedals = Parts("bicycle", PALETTE)
    pedals.add("metal", frustum(0.08, 0.08, 0.2, sides=10, z=-0.1), at(ry=math.pi / 2))
    for side in (-1, 1):
        pedals.add("metal", cuboid(0.03, 0.03, 0.17), at(side * 0.1, 0, -side * 0.085))
        pedals.add("grip", cuboid(0.12, 0.07, 0.03), at(side * 0.16, 0, -side * 0.17))
    pedals.objects("bicycle-crank", crank)
    return root


bicycle = build()
finish(bicycle, "bicycle")
