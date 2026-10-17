"""Shared helpers for the Blender build scripts in this folder.

Each `build_<name>.py` adds this folder to `sys.path`, imports from here,
builds its model under a root empty named `<name>`, and calls `export`.
Run a build script headless from the repository root with:

    SUNFLOWER_EXPORT=1 SUNFLOWER_REPO=$PWD blender --background \\
      --factory-startup --python assets/blender/build_<name>.py

Conventions for game assets made in Blender (see docs/adding-places.md):
- 1 Blender unit = 1 game unit; the heroine is about 2.3 tall.
- Blender -Y is the model's front (+Z in the game once exported Y-up).
- The root empty is named after the model, so `loadModels` finds it.
- Parts the game moves are their own named nodes.
- Custom properties export as glTF extras and arrive as `userData`.
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix

REPO = os.environ.get("SUNFLOWER_REPO") or os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name, hexcode):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    hexcode = hexcode.lstrip("#")
    rgb = [srgb_to_linear(int(hexcode[i : i + 2], 16) / 255) for i in (0, 2, 4)]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = 0.88
    bsdf.inputs["Metallic"].default_value = 0
    mat.diffuse_color = (*rgb, 1)
    return mat


class Parts:
    """Bmesh pieces tagged with a palette colour, merged into one flat-shaded
    mesh per colour per node, which keeps draw calls low in the game."""

    def __init__(self, model, palette):
        self.model = model
        self.palette = palette
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
            mesh.materials.append(material(f"{self.model}-{key}", self.palette[key]))
            obj = bpy.data.objects.new(f"{prefix}-{key}", mesh)
            obj["flatShading"] = True
            obj["castShadow"] = True
            obj["receiveShadow"] = True
            bpy.context.collection.objects.link(obj)
            obj.parent = parent
            result.append(obj)
        self.pieces = {}
        return result


def frustum(r1, r2, h, sides=8, z=0):
    def build(bm):
        bmesh.ops.create_cone(
            bm, cap_ends=True, segments=sides, radius1=r1, radius2=r2, depth=h
        )
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, z + h / 2))
        # Turn a polygon so a flat face, not a corner, looks forward.
        bmesh.ops.rotate(
            bm,
            verts=bm.verts,
            cent=(0, 0, 0),
            matrix=Matrix.Rotation(math.pi / sides, 3, "Z"),
        )

    return build


def cuboid(sx, sy, sz):
    def build(bm):
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)

    return build


def ellipsoid(sx, sy, sz, subdivisions=2):
    def build(bm):
        bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=1)
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


def export(root, name):
    """Save `<name>.blend` beside the scripts and export `<name>.glb`."""
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [root, *root.children_recursive]:
        obj.select_set(True)
    blend = os.path.join(REPO, "assets", "blender", f"{name}.blend")
    glb = os.path.join(REPO, "src", "assets", "models", f"{name}.glb")
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


def finish(root, name):
    print("built", name, len(root.children_recursive), "objects")
    if os.environ.get("SUNFLOWER_EXPORT"):
        print("saved", *export(root, name))
