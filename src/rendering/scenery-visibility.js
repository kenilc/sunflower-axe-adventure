import * as THREE from "three";
import {
  createTreeVisibility,
  isVisibilityManaged,
} from "./tree-visibility.js";

// Fill the gaps around the specialized forest/landscape controllers. Index
// scenery before characters or temporary props are added to a destination;
// exclude both actors wherever they already live in its hierarchy. Other
// characters built into a place (animals strolling or at home) set
// `userData.keepSolid` and are skipped too, so they never turn see-through.
export function createSceneryVisibility({ group, actors }) {
  const visibility = createTreeVisibility();
  const bounds = new THREE.Box3();
  let count = 0;
  group.updateWorldMatrix(true, true);
  function collect(node, meshes) {
    if (actors.includes(node) || node.userData.keepSolid) return;
    if (node.isMesh && !node.isInstancedMesh && !isVisibilityManaged(node)) {
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      if (
        materials.every(
          (material) => !material.transparent && material.opacity === 1,
        )
      ) {
        node.geometry.computeBoundingBox();
        bounds.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld);
        // Flat ground cannot cross the standing heroine's silhouette. Water,
        // glass, particles and instance forests keep their own rendering rules.
        if (bounds.max.y > 0.45) meshes.push(node);
      }
    }
    node.children.forEach((child) => collect(child, meshes));
  }
  for (const object of group.children) {
    const meshes = [];
    collect(object, meshes);
    if (!meshes.length) continue;
    visibility.add(object, { meshes, dynamic: true });
    count += meshes.length;
  }
  return {
    count,
    update(camera, heroine, dt, enabled = true) {
      if (group.visible) visibility.update(camera, [heroine], dt, enabled);
    },
  };
}
