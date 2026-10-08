import * as THREE from "three";

export function createMeshFactory(scene) {
  const mats = {};
  function mat(c) {
    return (mats[c] ??= new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.88,
      flatShading: true,
    }));
  }
  function mesh(geo, c, x = 0, y = 0, z = 0, parent = scene) {
    const m = new THREE.Mesh(geo, typeof c === "string" ? mat(c) : c);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (w, h, d, c, x, y, z, p) =>
    mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z, p);
  const ball = (r, c, x, y, z, p) =>
    mesh(new THREE.IcosahedronGeometry(r, 1), c, x, y, z, p);
  const cyl = (a, b, h, c, x, y, z, p, n = 8) =>
    mesh(new THREE.CylinderGeometry(a, b, h, n), c, x, y, z, p);
  return { mat, mesh, box, ball, cyl };
}
