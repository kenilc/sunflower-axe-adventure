import * as THREE from "three";

let shadeTexture;
function texture() {
  if (shadeTexture) return shadeTexture;
  const size = 32,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - 15.5, y - 15.5) / 15.5;
      pixels.set(
        [255, 255, 255, Math.round(Math.max(0, 1 - r) ** 1.5 * 255)],
        (y * size + x) * 4,
      );
    }
  shadeTexture = new THREE.DataTexture(pixels, size, size);
  shadeTexture.needsUpdate = true;
  return shadeTexture;
}

// Soft dark patches on the ground under trees, tilted to the slope, in one
// instanced batch. Forests on distant mountains lie beyond the sun's shadow
// area, so without these the trees look pinned onto the slopes.
// Each site is { position, normal, radius }. Near-vertical rock (steeper
// than about 65°) gets no patch, where it would read as a dark smudge.
export function createGroundShade(
  sites,
  { color = "#142010", opacity = 0.85, minUpward = 0.42 } = {},
) {
  const shade = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color,
      map: texture(),
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    sites.length,
  );
  shade.name = "ground-shade";
  const transform = new THREE.Object3D(),
    up = new THREE.Vector3(0, 1, 0);
  // A hidden patch collapses where it stands, so bounds stay on the slope.
  const hidden = sites.map(({ position }) =>
    new THREE.Matrix4().makeScale(0, 0, 0).setPosition(position),
  );
  const matrices = sites.map(({ position, normal, radius }, i) => {
    if (normal.y < minUpward) {
      shade.setMatrixAt(i, hidden[i]);
      return hidden[i];
    }
    transform.position.copy(position).addScaledVector(normal, 0.05);
    transform.quaternion.setFromUnitVectors(up, normal);
    transform.scale.setScalar(radius * 2);
    transform.updateMatrix();
    shade.setMatrixAt(i, transform.matrix);
    return transform.matrix.clone();
  });
  shade.computeBoundingSphere();
  return {
    mesh: shade,
    // Hide or show the patch under one tree.
    setHidden(index, hide) {
      shade.setMatrixAt(index, hide ? hidden[index] : matrices[index]);
      shade.instanceMatrix.needsUpdate = true;
    },
  };
}
