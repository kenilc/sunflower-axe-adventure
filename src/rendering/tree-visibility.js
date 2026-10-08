import * as THREE from "../../vendor/three.module.js";

// Fade only trees between the camera and either character's silhouette.
export function createTreeVisibility({
  cameraClearance = 0,
  obstructedOpacity = 0.08,
} = {}) {
  const trees = [];
  const raycaster = new THREE.Raycaster();
  const point = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const rays = [];
  const hits = [];
  function add(group) {
    group.updateWorldMatrix(true, true);
    trees.push({
      bounds: new THREE.Box3().setFromObject(group),
      meshes: group.children.filter((child) => child.isMesh),
      materials: null,
      opacity: 1,
    });
  }
  function update(camera, characters, dt) {
    rays.length = 0;
    cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    for (const character of characters) {
      for (const height of [0.7, 1.6, 2.5]) {
        for (const offset of [-0.4, 0, 0.4]) {
          point.copy(character.position);
          point.y += height;
          // Sample across the screen, regardless of the camera's heading.
          point.addScaledVector(cameraRight, offset);
          direction.copy(point).sub(camera.position);
          const distance = direction.length();
          rays.push({ direction: direction.clone().normalize(), distance });
        }
      }
    }
    for (const tree of trees) {
      // Rays starting inside a mesh can miss its outward-facing triangles.
      let obstructing =
        tree.bounds.distanceToPoint(camera.position) <= cameraClearance;
      for (const ray of obstructing ? [] : rays) {
        raycaster.set(camera.position, ray.direction);
        raycaster.near = 0;
        raycaster.far = ray.distance;
        if (!raycaster.ray.intersectsBox(tree.bounds)) continue;
        hits.length = 0;
        raycaster.intersectObjects(tree.meshes, false, hits);
        if (hits.length) {
          obstructing = true;
          break;
        }
      }
      const target = obstructing ? obstructedOpacity : 1;
      tree.opacity = THREE.MathUtils.lerp(
        tree.opacity,
        target,
        1 - Math.exp(-dt * 12),
      );
      if (Math.abs(tree.opacity - target) < 0.002) tree.opacity = target;
      if (!tree.materials && tree.opacity < 1) {
        // Garden materials are shared; give each fading tree its own copies.
        tree.materials = tree.meshes.map((mesh) => {
          mesh.material = mesh.material.clone();
          return mesh.material;
        });
      }
      tree.materials?.forEach((material, i) => {
        const fading = tree.opacity < 1;
        if (material.transparent !== fading) {
          material.transparent = fading;
          material.needsUpdate = true;
        }
        material.opacity = tree.opacity;
        material.depthWrite = !fading;
        tree.meshes[i].castShadow = !fading;
      });
    }
  }
  return { add, update };
}
