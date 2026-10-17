import * as THREE from "three";

// A Dutch fingerpost-style gate: white posts with red-and-white tops and a
// blue sign, walked through like the winter signposts.
export function createPolderSign({ parent, helpers, text, subtitle, x, z }) {
  const { mesh, box, cyl } = helpers;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  for (const side of [-1, 1]) {
    cyl(0.14, 0.17, 4.2, "#f4efe2", side * 2.5, 2.1, 0, group);
    for (let i = 0; i < 3; i++)
      cyl(
        0.18,
        0.18,
        0.22,
        i % 2 ? "#f4efe2" : "#c8573f",
        side * 2.5,
        3.6 + i * 0.22,
        0,
        group,
      );
    mesh(
      new THREE.ConeGeometry(0.24, 0.4, 8),
      "#c8573f",
      side * 2.5,
      4.48,
      0,
      group,
    );
  }
  box(5.5, 1.1, 0.22, "#2f5f8a", 0, 3.4, 0, group);
  box(5.7, 0.14, 0.32, "#f4efe2", 0, 4.0, 0, group);
  box(5.7, 0.14, 0.32, "#f4efe2", 0, 2.8, 0, group);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 224;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#2f5f8a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6e4";
  ctx.font = "bold 66px sans-serif";
  ctx.fillText(text, 512, 98);
  ctx.font = "30px sans-serif";
  ctx.fillText(subtitle, 512, 167);
  const material = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(canvas),
  });
  for (const side of [-1, 1]) {
    const face = mesh(
      new THREE.PlaneGeometry(5.4, 1.06),
      material,
      0,
      3.4,
      side * 0.12,
      group,
    );
    face.rotation.y = side < 0 ? Math.PI : 0;
    face.castShadow = false;
  }
  const local = new THREE.Vector3();
  function relative(position) {
    group.updateWorldMatrix(true, false);
    return group.worldToLocal(local.copy(position));
  }
  return {
    group,
    blockers: [-1, 1].map((side) => ({ x: x + side * 2.5, z, r: 0.25 })),
    contains(position) {
      const p = relative(position);
      return Math.abs(p.x) < 2 && Math.abs(p.z) < 0.9;
    },
    nearby(position) {
      const p = relative(position);
      return Math.abs(p.x) < 2.3 && Math.abs(p.z) < 3.8;
    },
  };
}
