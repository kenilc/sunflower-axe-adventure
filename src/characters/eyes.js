import * as THREE from "three";

export function createCharacterEyes({ body, ball, mesh }) {
  const open = new THREE.Group(),
    closed = new THREE.Group();
  open.name = "open-eyes";
  closed.name = "closed-eyes";
  body.add(open, closed);
  closed.visible = false;
  for (const side of [-1, 1]) {
    ball(0.077, "#302d25", side * 0.19, 2.15, 0.672, open);
    ball(0.022, "#fff9dd", side * 0.19 - 0.015, 2.175, 0.733, open);
    const lid = mesh(
      new THREE.TorusGeometry(0.085, 0.013, 5, 12, Math.PI),
      "#64483a",
      side * 0.19,
      2.18,
      0.713,
      closed,
    );
    lid.rotation.z = Math.PI;
  }
  return bindCharacterEyes({ open, closed });
}

export function bindCharacterEyes({ open, closed }) {
  return {
    open,
    closed,
    setClosed(value) {
      open.visible = !value;
      closed.visible = value;
    },
  };
}
