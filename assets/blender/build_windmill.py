"""Build the Tulip Polder windmill in Blender and export it for the game.

From the repository root (see kit.py for the conventions):

    SUNFLOWER_EXPORT=1 SUNFLOWER_REPO=$PWD blender --background \\
      --factory-startup --python assets/blender/build_windmill.py

It saves `windmill.blend` beside this script and exports
`src/assets/models/windmill.glb`. The `sails` node turns about its local Z
axis in the game. Hand edits belong in the .blend; re-running this script
overwrites them.
"""

import math
import os
import sys

import bmesh
from mathutils import Matrix, Vector

sys.path.insert(
    0,
    os.path.join(os.environ.get("SUNFLOWER_REPO", os.getcwd()), "assets", "blender"),
)
from kit import Parts, at, clear_scene, cuboid, empty, finish, frustum  # noqa: E402

SCALE = 1.7
STAGE = 2.35  # height of the stage deck before scaling

PALETTE = {
    "brick": "#b65a43",
    "stone": "#c9bba3",
    "wood": "#6f8f7c",
    "trim": "#f4efe2",
    "cap": "#c8573f",
    "thatch": "#8d7a5c",
    "door": "#3f5c4c",
    "doorway": "#2b2622",
    "window": "#f2cf86",
    "timber": "#7a5a3e",
    "cloth": "#ece0c6",
}


def build():
    clear_scene()
    root = empty("windmill")
    tower = Parts("windmill", PALETTE)

    # Stone foot and brick base storey with an open doorway (its door swung
    # back) and two windows. The base is tall enough to walk into.
    tower.add("stone", frustum(2.75, 2.7, 0.35))
    tower.add("brick", frustum(2.55, 2.45, STAGE - 0.35, z=0.35))
    tower.add("doorway", cuboid(1.15, 0.24, 1.75), at(0, -2.3, 1.225))
    tower.add("trim", cuboid(1.4, 0.2, 0.16), at(0, -2.33, 2.17))
    for side in (-1, 1):
        tower.add("trim", cuboid(0.14, 0.2, 1.8), at(side * 0.64, -2.33, 1.25))
    tower.add(
        "door",
        cuboid(1.1, 0.08, 1.7),
        at(-0.62, -2.45, 1.2) @ Matrix.Rotation(-1.75, 4, "Z") @ Matrix.Translation((-0.55, 0, 0)),
    )
    for side in (-1, 1):
        tower.add("window", cuboid(0.5, 0.16, 0.5), at(side * 1.45, -2.12, 1.45, rz=side * -0.36))

    # The stage (gallery) around the waist, with posts and a rail. Its deck
    # is walkable in the game.
    tower.add("timber", frustum(3.45, 3.45, 0.16, z=STAGE))
    ring = 3.3
    for i in range(16):
        angle = i / 16 * math.tau
        x, y = math.cos(angle) * ring, math.sin(angle) * ring
        tower.add("timber", cuboid(0.09, 0.09, 0.75), at(x, y, STAGE + 0.53))
    for i in range(8):
        angle = (i + 0.5) / 8 * math.tau
        length = 2 * ring * math.tan(math.pi / 8) + 0.1
        x, y = math.cos(angle) * ring * math.cos(math.pi / 8), math.sin(angle) * ring * math.cos(math.pi / 8)
        tower.add("trim", cuboid(length, 0.1, 0.08), at(x, y, STAGE + 0.9, rz=angle + math.pi / 2))

    # The tapering octagonal smock, thatched above the stage, with white
    # bands, a door onto the stage and small windows facing forward.
    tower.add("thatch", frustum(2.25, 1.35, 5.6, z=STAGE))
    for z, r in ((STAGE + 0.16, 2.24), (STAGE + 2.8, 1.85), (STAGE + 5.5, 1.42)):
        tower.add("trim", frustum(r + 0.06, r + 0.04, 0.14, z=z - 0.07))
    slope = 0.9 / 5.6
    def smock_face(z):
        return -(2.25 - slope * (z - STAGE)) * math.cos(math.pi / 8)
    door_z = STAGE + 0.85
    tower.add("doorway", cuboid(0.82, 0.24, 1.38), at(0, smock_face(door_z) + 0.02, door_z, rx=slope))
    tower.add("trim", cuboid(1.0, 0.24, 0.12), at(0, smock_face(door_z + 0.75) - 0.01, door_z + 0.75, rx=slope))
    for z in (STAGE + 2.3, STAGE + 4.3):
        tower.add("window", cuboid(0.42, 0.2, 0.55), at(0, smock_face(z) - 0.02, z, rx=slope))
        tower.add("trim", cuboid(0.56, 0.2, 0.08), at(0, smock_face(z + 0.33) - 0.03, z + 0.33, rx=slope))

    # Cap: a white curb ring, then a red rounded hood.
    top = STAGE + 5.6
    tower.add("trim", frustum(1.55, 1.55, 0.22, z=top))
    def hood(bm):
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.05], context="VERTS")
        bmesh.ops.scale(bm, vec=(1.62, 2.05, 1.45), verts=bm.verts)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, top + 0.22))
    tower.add("cap", hood)

    # Tail pole and its wheel, running from the back of the cap to the stage.
    tail_top = Vector((0, 1.4, top + 0.2))
    tail_foot = Vector((0, 3.35, STAGE + 0.3))
    tail = tail_foot - tail_top
    tower.add(
        "timber",
        cuboid(0.18, 0.18, tail.length),
        Matrix.Translation((tail_top + tail_foot) / 2) @ Matrix.Rotation(math.atan2(-tail.y, tail.z), 4, "X"),
    )
    tower.add("timber", frustum(0.45, 0.45, 0.12, sides=10), at(0, 3.4, STAGE + 0.65, ry=math.pi / 2) @ Matrix.Translation((0, 0, -0.06)))
    tower.objects("windmill", root)

    # The windshaft leans back a little like real mills; the sails node
    # beneath it is upright in its own frame so the game spins it about Z.
    shaft = empty("windshaft", root, (0, -1.75, STAGE + 6.6))
    shaft.rotation_euler = (math.radians(-8), 0, 0)
    axle = Parts("windmill", PALETTE)
    axle.add("timber", frustum(0.2, 0.2, 1.0, sides=8), at(0, 0.1, 0, rx=math.pi / 2))
    axle.objects("windshaft", shaft)

    sails = empty("sails", shaft, (0, -0.45, 0))
    sails["spin"] = "z"
    blades = Parts("windmill", PALETTE)
    blades.add("cap", lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.32))
    reach, inner, width = 4.9, 0.9, 1.05
    for arm in range(4):
        turn = Matrix.Rotation(arm * math.pi / 2 + math.pi / 4, 4, "Y")
        blades.add("trim", cuboid(0.16, 0.14, reach + 0.1), turn @ at(0, 0, (reach + 0.1) / 2))
        # A ladder-like lattice on the leading side; two opposite sails
        # carry cloth, the other two stay open, as mills often do.
        rail_x = width
        blades.add("trim", cuboid(0.07, 0.07, reach - inner), turn @ at(rail_x, 0, (reach + inner) / 2))
        bars = 9
        for b in range(bars + 1):
            z = inner + (reach - inner) * b / bars
            blades.add("trim", cuboid(width, 0.06, 0.06), turn @ at(width / 2, 0, z))
        if arm % 2 == 0:
            blades.add("cloth", cuboid(width - 0.08, 0.03, reach - inner - 0.25), turn @ at(width / 2, 0.06, (reach + inner) / 2 + 0.1))
    blades.objects("sails", sails)
    # The whole mill is built at a small scale and enlarged, so the walk-in
    # doors fit the friends; the game reads its sizes from WINDMILL in
    # src/locations/polder/world.js, which must match.
    root.scale = (SCALE, SCALE, SCALE)
    return root


windmill = build()
finish(windmill, "windmill")
