"""Build the sleepy animal-head houses of the misty forest village and export
them for the game.

From the repository root (see kit.py for the conventions):

    SUNFLOWER_EXPORT=1 SUNFLOWER_REPO=$PWD blender --background \\
      --factory-startup --python assets/blender/build_mist_houses.py

Four houses under one `mist_houses` root: `cat-house`, `rabbit-house`,
`frog-house` and `owl-house`, each standing on the ground at its own origin
and facing the model's front. They are meant to look mysterious but cute:
smooth chubby heads, eyes with pupils and catchlights (or happy closed arcs),
blush, a small smile, and a little closed door under it. Each house has a
`glow` node (door window and lantern) for the game's glow layer.
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
    "cat": "#f4e7d7",
    "rabbit": "#f7eff0",
    "frog": "#bfe2bd",
    "owl": "#dcc3a4",
    "owl-belly": "#f3e4cc",
    "pink": "#f2b6b8",
    "blush": "#f5a6a8",
    "eye": "#3a2f36",
    "shine": "#ffffff",
    "door": "#a8714a",
    "trim": "#7d5236",
    "glow": "#ffd99a",
    "post": "#6b4d38",
    "moss": "#8fb27a",
    "beak": "#f0b864",
}
# Heads and ears are smooth; small details keep the game's faceted look.
SMOOTH = {"cat", "rabbit", "frog", "owl", "owl-belly", "pink", "blush"}


class Head:
    """A chubby ellipsoid head; features are placed on its surface."""

    def __init__(self, parts, key, a, b, c, cz):
        self.parts, self.a, self.b, self.c, self.cz = parts, a, b, c, cz
        self.key = key
        if key:
            parts.add(key, ellipsoid(a, b, c, 3), at(0, 0, cz))

    def surface(self, x, z, lift=0.0):
        """The front surface point at (x, z) and the matrix facing out of it."""
        u, w = x / self.a, (z - self.cz) / self.c
        y = -self.b * math.sqrt(max(0.02, 1 - u * u - w * w))
        normal = Vector((x / self.a**2, y / self.b**2, (z - self.cz) / self.c**2))
        normal.normalize()
        point = Vector((x, y, z)) + normal * lift
        turn = normal.to_track_quat("-Y", "Z").to_matrix().to_4x4()
        return Matrix.Translation(point) @ turn

    def add(self, key, build, x, z, lift=0.0, local=Matrix()):
        self.parts.add(key, build, self.surface(x, z, lift) @ local)


def arc(radius, start, end, thickness, segments=10, sides=6):
    """A tube bent along a circle in the XZ plane, facing -Y (a smile, a lid)."""

    def build(bm):
        rings = []
        for i in range(segments + 1):
            t = start + (end - start) * i / segments
            centre = Vector((radius * math.cos(t), 0, radius * math.sin(t)))
            out = Vector((math.cos(t), 0, math.sin(t)))
            ring = []
            for j in range(sides):
                v = j / sides * math.tau
                offset = out * math.cos(v) + Vector((0, 1, 0)) * math.sin(v)
                ring.append(bm.verts.new(centre + offset * thickness))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for j in range(sides):
                k = (j + 1) % sides
                bm.faces.new((a[j], b[j], b[k], a[k]))
        for ring in (rings[0], rings[-1]):
            bm.faces.new(ring)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    return build


def disc(r, depth, sides=16):
    """A flat round disc facing -Y."""
    return lambda bm: (
        frustum(r, r, depth, sides)(bm),
        bmesh.ops.rotate(
            bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X")
        ),
    )


def open_eye(head, x, z, size=0.36):
    """A big dark baby eye with two catchlights."""
    head.add("eye", ellipsoid(size * 0.8, 0.12, size, 2), x, z, -0.02)
    head.add("shine", ellipsoid(size * 0.3, 0.06, size * 0.3, 1), x, z, 0.09,
             at(-size * 0.28, 0, size * 0.35))
    head.add("shine", ellipsoid(size * 0.14, 0.05, size * 0.14, 1), x, z, 0.08,
             at(size * 0.3, 0, -size * 0.32))


def happy_eye(head, x, z, size=0.3):
    """A closed, contented eye: a soft upward-curving arc."""
    head.add("eye", arc(size, math.pi * 1.15, math.pi * 1.85, 0.06), x, z + size * 0.6, 0.02)


def face(head, eye_z, eye_x, smile_z, eyes="open", eye_size=0.36):
    for side in (-1, 1):
        if eyes == "open":
            open_eye(head, side * eye_x, eye_z, eye_size)
        else:
            happy_eye(head, side * eye_x, eye_z, eye_size * 0.85)
        head.add("blush", ellipsoid(0.34, 0.06, 0.2, 2), side * (eye_x + 0.32),
                 eye_z - 0.55, 0.0)
    head.add("eye", arc(0.22, math.pi * 1.2, math.pi * 1.8, 0.045), 0, smile_z + 0.2, 0.02)


def door(parts, glow, head, z_top, width=1.0):
    """A small closed round-topped door with a lit porthole, set into the chin."""
    y = head.surface(0, 0.7)[1][3] - 0.05
    h = z_top - 0.55
    # A little rounded porch, in the head's colour, joins the door to the head.
    parts.add(head.key, cuboid(width + 0.6, 1.8, h), at(0, y + 0.9, h / 2))
    parts.add(head.key, disc(width / 2 + 0.3, 1.8), at(0, y + 1.8, h))
    parts.add("trim", cuboid(width + 0.2, 0.3, h + 0.1), at(0, y + 0.02, (h + 0.1) / 2))
    parts.add("trim", disc(width / 2 + 0.1, 0.3), at(0, y + 0.02, h))
    parts.add("door", cuboid(width, 0.3, h), at(0, y - 0.04, h / 2))
    parts.add("door", disc(width / 2, 0.3), at(0, y - 0.04, h))
    parts.add("trim", ellipsoid(0.06, 0.06, 0.06, 1), at(width * 0.3, y - 0.22, h * 0.5))
    glow.add("glow", disc(0.2, 0.3), at(0, y - 0.08, h * 0.95))
    # Two flat stepping stones in front.
    parts.add("moss", frustum(0.5, 0.55, 0.1, 9), at(0, y - 0.7, 0))
    parts.add("moss", frustum(0.4, 0.45, 0.1, 9), at(0.35, y - 1.5, 0))


def lantern(parts, glow, x, y):
    """A crook-topped post with a round paper lantern beside the door."""
    parts.add("post", frustum(0.06, 0.05, 2.1, 6), at(x, y, 0))
    parts.add("post", cuboid(0.5, 0.08, 0.08), at(x - math.copysign(0.22, x), y, 2.08))
    parts.add("post", frustum(0.015, 0.015, 0.2, 4), at(x - math.copysign(0.42, x), y, 1.86))
    glow.add("glow", ellipsoid(0.2, 0.2, 0.24, 2), at(x - math.copysign(0.42, x), y, 1.66))


def house(name, root, offset, build):
    node = empty(name, root, offset)
    parts = Parts("mist", PALETTE)
    glow = Parts("mist", PALETTE)
    build(parts, glow)
    for obj in parts.objects(name, node):
        if obj.name.split("-")[-1] in SMOOTH or obj.name.endswith("owl-belly"):
            for poly in obj.data.polygons:
                poly.use_smooth = True
            obj["flatShading"] = False
    glow_node = empty(f"{name}-glow", node)
    for obj in glow.objects(f"{name}-glow", glow_node):
        obj["castShadow"] = False
        mat = obj.data.materials[0]
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Emission Color"].default_value = bsdf.inputs["Base Color"].default_value
        bsdf.inputs["Emission Strength"].default_value = 3.0
    node["glow"] = f"{name}-glow"
    return node


def cat(parts, glow):
    head = Head(parts, "cat", 2.5, 2.2, 2.25, 2.1)
    for side in (-1, 1):
        ear = at(side * 1.45, 0.1, 3.85, ry=side * 0.38)
        parts.add("cat", frustum(0.75, 0.12, 1.2, 12), ear)
        parts.add("pink", frustum(0.48, 0.08, 0.9, 12), ear @ at(0, -0.3, 0.05))
        parts.add("cat", ellipsoid(0.16, 0.16, 0.16, 2), ear @ at(0, 0, 1.18))
        # Short, soft whiskers.
        for k, tilt in ((0, 0.12), (1, -0.1)):
            head.add("trim", cuboid(0.7, 0.04, 0.035), side * 2.05, 1.75 - k * 0.22, 0.02,
                     at(0, 0, 0, ry=side * tilt))
    face(head, 2.75, 0.9, 1.95, eyes="happy")
    head.add("pink", ellipsoid(0.16, 0.08, 0.11, 2), 0, 2.28, 0.0)
    door(parts, glow, head, 1.55)
    lantern(parts, glow, 2.1, -2.0)


def rabbit(parts, glow):
    head = Head(parts, "rabbit", 2.3, 2.1, 2.3, 2.15)
    for side in (-1, 1):
        ear = at(side * 0.75, 0.2, 3.9, ry=side * 0.18)
        parts.add("rabbit", ellipsoid(0.45, 0.32, 1.5, 3), ear @ at(0, 0, 1.25))
        parts.add("pink", ellipsoid(0.27, 0.2, 1.15, 3), ear @ at(0, -0.17, 1.25))
    face(head, 2.7, 0.85, 1.95, eyes="open", eye_size=0.34)
    head.add("pink", ellipsoid(0.13, 0.08, 0.1, 2), 0, 2.25, 0.0)
    door(parts, glow, head, 1.5)
    lantern(parts, glow, -2.0, -1.9)


def frog(parts, glow):
    head = Head(parts, "frog", 2.8, 2.2, 1.75, 1.6)
    for side in (-1, 1):
        parts.add("frog", ellipsoid(0.85, 0.8, 0.8, 3), at(side * 1.3, -0.5, 3.0))
        bump = Head(parts, None, 0.85, 0.8, 0.8, 3.0)
        # The eyes sit on the bumps, so place them on the bump's surface.
        surface = bump.surface(0, 3.05, -0.02)
        turn = Matrix.Translation((side * 1.3, -0.5, 0)) @ surface
        parts.add("eye", ellipsoid(0.42, 0.12, 0.48, 2), turn)
        parts.add("shine", ellipsoid(0.14, 0.06, 0.14, 1), turn @ at(-0.12, -0.1, 0.17))
        parts.add("shine", ellipsoid(0.07, 0.05, 0.07, 1), turn @ at(0.13, -0.09, -0.15))
        head.add("blush", ellipsoid(0.38, 0.06, 0.22, 2), side * 1.75, 1.75, 0.0)
    # A wide, gentle frog smile.
    head.add("eye", arc(0.75, math.pi * 1.25, math.pi * 1.75, 0.05), 0, 2.55, 0.03)
    parts.add("moss", ellipsoid(0.7, 0.5, 0.25, 2), at(0.3, 0.4, 3.25))
    door(parts, glow, head, 1.35)
    lantern(parts, glow, 2.4, -1.7)


def owl(parts, glow):
    head = Head(parts, "owl", 2.2, 2.0, 2.6, 2.4)
    # A pale tummy just showing through the front of the head.
    parts.add("owl-belly", ellipsoid(1.4, 1.2, 1.25, 3), at(0, -0.9, 1.3))
    for side in (-1, 1):
        tuft = at(side * 1.15, 0, 4.45, ry=side * 0.6)
        parts.add("owl", frustum(0.42, 0.1, 0.55, 12), tuft)
        parts.add("owl", ellipsoid(0.12, 0.12, 0.12, 2), tuft @ at(0, 0, 0.55))
        head.add("owl-belly", ellipsoid(0.62, 0.1, 0.62, 3), side * 0.75, 3.15, -0.02)
        open_eye(head, side * 0.75, 3.15, 0.44)
        head.add("blush", ellipsoid(0.3, 0.06, 0.18, 2), side * 1.45, 2.55, 0.0)
    head.add("beak", ellipsoid(0.16, 0.14, 0.22, 2), 0, 2.7, 0.0)
    door(parts, glow, head, 1.45)
    lantern(parts, glow, -2.0, -1.8)


def build():
    clear_scene()
    root = empty("mist_houses")
    house("cat-house", root, (0, 0, 0), cat)
    house("rabbit-house", root, (6.5, 0, 0), rabbit)
    house("frog-house", root, (-6.5, 0, 0), frog)
    house("owl-house", root, (13, 0, 0), owl)
    return root


houses = build()
finish(houses, "mist_houses")
