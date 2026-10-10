import * as THREE from "three";

export function createWinterSign({ parent, helpers, text, subtitle, x, z }) {
  const { mesh, box, cyl } = helpers;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  for (const side of [-1, 1]) {
    cyl(0.13, 0.18, 4.2, "#67564b", side * 2.5, 2.1, 0, group);
    box(0.45, 0.15, 0.45, "#f2f6fa", side * 2.5, 4.22, 0, group);
  }
  box(5.5, 1.1, 0.22, "#355662", 0, 3.65, 0, group);
  box(5.8, 0.18, 0.5, "#f2f6fa", 0, 4.28, 0, group);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 224;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#355662";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff2d8";
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
      3.65,
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

export function createWinterLabel({
  parent,
  helpers,
  text,
  x,
  y,
  z,
  width = 3,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#355662";
  ctx.fillRect(0, 0, 768, 160);
  ctx.fillStyle = "#fff2d8";
  ctx.textAlign = "center";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText(text, 384, 98);
  const label = helpers.mesh(
    new THREE.PlaneGeometry(width, 0.65),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }),
    x,
    y,
    z,
    parent,
  );
  label.castShadow = false;
  return label;
}
