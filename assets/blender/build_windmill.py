"""Build the Tulip Polder windmill in Blender and export it for the game.

Run inside Blender (Scripting tab, or via MCP):
    exec(open("<repo>/assets/blender/build_windmill.py").read())

It clears the scene, builds the mill, saves `windmill.blend` beside this
script and exports `src/assets/models/windmill.glb`. Hand edits belong in the
.blend; re-running this script overwrites them.

Conventions for game assets made in Blender (see docs/adding-places.md):
- 1 Blender unit = 1 game unit; the heroine is about 2.3 tall.
- Blender -Y is the model's front (+Z in the game once exported Y-up).
- The root empty is named after the model, so `loadModels` finds it.
- Parts the game moves are their own named nodes, such as `sails`, which
  turns about its local Z axis in the game.
- Custom properties export as glTF extras and arrive as `userData`.
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else None
REPO = os.environ.get("SUNFLOWER_REPO") or (
    os.path.abspath(os.path.join(HERE, "..", "..")) if HERE else None
)

PALETTE = {
    "brick": "#b65a43",
    "stone": "#c9bba3",
    "wood": "#6f8f7c",
    "trim": "#f4efe2",
    "cap": "#c8573f",
    "thatch": "#8d7a5c",
    "door": "#3f5c4c",
    "window": "#f2cf86",
    "timber": "#7a5a3e",
    "cloth": "#ece0c6",
}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(key):
    name = f"windmill-{key}"
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    hexcode = PALETTE[key].lstrip("#")
    rgb = [srgb_to_linear(int(hexcode[i : i + 2], 16) / 255) for i in (0, 2, 4)]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = 0.88
    bsdf.inputs["Metallic"].default_value = 0
    mat.diffuse_color = (*rgb, 1)
    return mat


# Each part is a bmesh piece tagged with a material; pieces are merged into
# one mesh per material per node, which keeps draw calls low in the game.
class Parts:
    def __init__(self):
        self.pieces = {}

    def add(self, key, build, matrix=Matrix()):
        bm = self.pieces.setdefault(key, bmesh.new())
        piece = bmesh.new()
        build(piece)
        piece.transform(matrix)
        mesh = bpy.data.meshes.new("tmp")
        piece.to_mesh(mesh)
        bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
        piece.free()

    def objects(self, prefix, parent):
        result = []
        for key, bm in self.pieces.items():
            mesh = bpy.data.meshes.new(f"{prefix}-{key}")
            bm.to_mesh(mesh)
            bm.free()
            for poly in mesh.polygons:
                poly.use_smooth = False
            mesh.materials.append(material(key))
            obj = bpy.data.objects.new(f"{prefix}-{key}", mesh)
            obj["flatShading"] = True
            obj["castShadow"] = True
            obj["receiveShadow"] = True
            bpy.context.collection.objects.link(obj)
            obj.parent = parent
            result.append(obj)
        return result


def frustum(r1, r2, h, sides=8, z=0):
    def build(bm):
        bmesh.ops.create_cone(
            bm, cap_ends=True, segments=sides, radius1=r1, radius2=r2, depth=h
        )
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, z + h / 2))
        # Turn an octagon so a flat face, not a corner, looks forward.
        bmesh.ops.rotate(
            bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / sides, 3, "Z")
        )

    return build


def cuboid(sx, sy, sz):
    def build(bm):
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)

    return build


def at(x=0, y=0, z=0, rx=0, ry=0, rz=0):
    return (
        Matrix.Translation((x, y, z))
        @ Matrix.Rotation(rz, 4, "Z")
        @ Matrix.Rotation(ry, 4, "Y")
        @ Matrix.Rotation(rx, 4, "X")
    )


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_size = 0.5
    obj.location = location
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def build():
    clear_scene()
    root = empty("windmill")
    tower = Parts()

    # Stone foot and brick base storey with a door and two windows.
    tower.add("stone", frustum(2.75, 2.7, 0.35))
    tower.add("brick", frustum(2.55, 2.45, 1.75, z=0.35))
    tower.add("door", cuboid(0.9, 0.2, 1.4), at(0, -2.42, 1.05))
    tower.add("trim", cuboid(1.1, 0.16, 0.14), at(0, -2.42, 1.8))
    for side in (-1, 1):
        tower.add("window", cuboid(0.5, 0.16, 0.5), at(side * 1.4, -2.15, 1.25, rz=side * -0.32))

    # The stage (gallery) around the waist, with posts and a rail.
    tower.add("timber", frustum(3.45, 3.45, 0.16, z=2.1))
    ring = 3.3
    for i in range(16):
        angle = i / 16 * math.tau
        x, y = math.cos(angle) * ring, math.sin(angle) * ring
        tower.add("timber", cuboid(0.09, 0.09, 0.75), at(x, y, 2.63))
    for i in range(8):
        angle = (i + 0.5) / 8 * math.tau
        length = 2 * ring * math.tan(math.pi / 8) + 0.1
        x, y = math.cos(angle) * ring * math.cos(math.pi / 8), math.sin(angle) * ring * math.cos(math.pi / 8)
        tower.add("trim", cuboid(length, 0.1, 0.08), at(x, y, 3.0, rz=angle + math.pi / 2))

    # The tapering octagonal smock, thatched above the stage, with white
    # bands and small windows facing forward.
    tower.add("thatch", frustum(2.25, 1.35, 5.6, z=2.1))
    for z, r in ((2.26, 2.24), (4.9, 1.85), (7.6, 1.42)):
        tower.add("trim", frustum(r + 0.06, r + 0.04, 0.14, z=z - 0.07))
    for z, r in ((3.8, 2.04), (6.2, 1.68)):
        tower.add("window", cuboid(0.42, 0.2, 0.55), at(0, -r * math.cos(math.pi / 8) - 0.02, z, rx=0.14))
        tower.add("trim", cuboid(0.56, 0.2, 0.08), at(0, -r * math.cos(math.pi / 8) - 0.03, z + 0.33, rx=0.14))

    # Cap: a white curb ring, then a red rounded hood.
    tower.add("trim", frustum(1.55, 1.55, 0.22, z=7.7))
    def hood(bm):
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.05], context="VERTS")
        bmesh.ops.scale(bm, vec=(1.62, 2.05, 1.45), verts=bm.verts)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 7.92))
    tower.add("cap", hood)

    # Tail pole and its wheel, running from the back of the cap to the stage.
    tail_top = Vector((0, 1.4, 7.9))
    tail_foot = Vector((0, 3.35, 2.4))
    tail = tail_foot - tail_top
    tower.add(
        "timber",
        cuboid(0.18, 0.18, tail.length),
        Matrix.Translation((tail_top + tail_foot) / 2) @ Matrix.Rotation(math.atan2(-tail.y, tail.z), 4, "X"),
    )
    tower.add("timber", frustum(0.45, 0.45, 0.12, sides=10), at(0, 3.4, 2.75, ry=math.pi / 2) @ Matrix.Translation((0, 0, -0.06)))
    tower.objects("windmill", root)

    # The windshaft leans back a little like real mills; the sails node
    # beneath it is upright in its own frame so the game spins it about Z.
    shaft = empty("windshaft", root, (0, -1.75, 8.7))
    shaft.rotation_euler = (math.radians(-8), 0, 0)
    axle = Parts()
    axle.add("timber", frustum(0.2, 0.2, 1.0, sides=8), at(0, 0.1, 0, rx=math.pi / 2))
    axle.objects("windshaft", shaft)

    sails = empty("sails", shaft, (0, -0.45, 0))
    sails["spin"] = "z"
    blades = Parts()
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
    return root


def export(root):
    if not REPO:
        raise RuntimeError("Set SUNFLOWER_REPO to the repository path")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [root, *root.children_recursive]:
        obj.select_set(True)
    blend = os.path.join(REPO, "assets", "blender", "windmill.blend")
    glb = os.path.join(REPO, "src", "assets", "models", "windmill.glb")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_yup=True,
        export_apply=True,
        export_lights=False,
        export_cameras=False,
    )
    return blend, glb


windmill = build()
print("built", len(windmill.children_recursive), "objects")
if os.environ.get("SUNFLOWER_EXPORT"):
    print("saved", *export(windmill))
