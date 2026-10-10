import * as THREE from "three";

const managedMeshes = new WeakSet();
export const isVisibilityManaged = (mesh) => managedMeshes.has(mesh);
function visible(object, root) {
  for (let node = object; node; node = node.parent) {
    if (!node.visible) return false;
    if (node === root) break;
  }
  return true;
}

// Fade scenery only along the supplied character sightlines. Gameplay supplies
// the heroine; the companion may pass behind opaque scenery.
export function createTreeVisibility({ obstructedOpacity = 0.08 } = {}) {
  const trees = [];
  const raycaster = new THREE.Raycaster();
  const point = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const reverse = new THREE.Vector3();
  const rays = [];
  const hits = [];
  function add(
    group,
    {
      meshes = group.isMesh
        ? [group]
        : group.children.filter((child) => child.isMesh),
      dynamic = false,
    } = {},
  ) {
    group.updateWorldMatrix(true, true);
    meshes.forEach((mesh) => managedMeshes.add(mesh));
    trees.push({
      bounds: new THREE.Box3().setFromObject(group),
      group,
      dynamic,
      meshes,
      castShadows: meshes.map((mesh) => mesh.castShadow),
      materialStates: meshes.map((mesh) =>
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(
          ({ opacity, transparent, depthWrite }) => ({
            opacity,
            transparent,
            depthWrite,
          }),
        ),
      ),
      materials: null,
      opacity: 1,
    });
  }
  function update(camera, characters, dt, enabled = true) {
    rays.length = 0;
    cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    for (const character of enabled ? characters : []) {
      for (const height of [0.7, 1.6, 2.5]) {
        for (const offset of [-0.4, 0, 0.4]) {
          point.copy(character.position);
          point.y += height;
          // Sample across the screen, regardless of the camera's heading.
          point.addScaledVector(cameraRight, offset);
          direction.copy(point).sub(camera.position);
          const distance = direction.length();
          if (distance > 0.001)
            rays.push({
              target: point.clone(),
              direction: direction.clone().normalize(),
              distance,
            });
        }
      }
    }
    for (const tree of trees) {
      if (tree.dynamic) {
        tree.group.updateWorldMatrix(true, true);
        tree.bounds.makeEmpty();
        for (const mesh of tree.meshes) {
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          tree.bounds.union(
            mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),
          );
        }
      }
      const meshes = tree.meshes.filter((mesh) => visible(mesh, tree.group));
      let obstructing = false;
      for (const ray of meshes.length ? rays : []) {
        raycaster.set(camera.position, ray.direction);
        raycaster.near = 0;
        raycaster.far = ray.distance;
        if (!raycaster.ray.intersectsBox(tree.bounds)) continue;
        hits.length = 0;
        raycaster.intersectObjects(meshes, false, hits);
        // From inside a canopy, front-face rays can miss the exit surface.
        // Trace the same segment back from her silhouette to catch that surface
        // without fading objects just because the camera is near their bounds.
        if (!hits.length) {
          raycaster.set(ray.target, reverse.copy(ray.direction).negate());
          raycaster.intersectObjects(meshes, false, hits);
        }
        if (hits.length) {
          obstructing = true;
          break;
        }
      }
      const target = obstructing ? obstructedOpacity : 1;
      tree.opacity = enabled
        ? THREE.MathUtils.lerp(tree.opacity, target, 1 - Math.exp(-dt * 12))
        : 1;
      if (Math.abs(tree.opacity - target) < 0.002) tree.opacity = target;
      if (!tree.materials && tree.opacity < 1) {
        // Garden materials are shared; give each fading tree its own copies.
        tree.materials = tree.meshes.map((mesh) => {
          const array = Array.isArray(mesh.material);
          const materials = (array ? mesh.material : [mesh.material]).map(
            (material) => material.clone(),
          );
          mesh.material = array ? materials : materials[0];
          return materials;
        });
      }
      tree.materials?.forEach((materials, i) => {
        const fading = tree.opacity < 1;
        materials.forEach((material, j) => {
          const natural = tree.materialStates[i][j];
          const transparent = fading || natural.transparent;
          if (material.transparent !== transparent) {
            material.transparent = transparent;
            material.needsUpdate = true;
          }
          material.opacity = tree.opacity * natural.opacity;
          material.depthWrite = fading ? false : natural.depthWrite;
        });
        tree.meshes[i].castShadow = !fading && tree.castShadows[i];
      });
    }
  }
  return { add, update };
}
