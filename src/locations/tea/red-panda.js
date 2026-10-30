import * as THREE from "three";
import { SCALE, biped, makeParts } from "../mist/residents.js";

// The tea house's keeper: a red panda in a cream shirt, a moss-green apron
// and a teal neckerchief, made like the hollow's storybook animals. It
// stands by the table with the teapot in its paw, its ringed tail swaying,
// looks round when the friends come near, and pours when they sit down.
export function createRedPanda(parent, { position, heading }) {
  const root = new THREE.Group();
  root.name = "tea-red-panda";
  root.userData.keepSolid = true;
  root.position.set(...position);
  root.rotation.y = heading;
  root.scale.setScalar(SCALE * 0.95);
  parent.add(root);
  const p = makeParts(root);
  const fur = "#c8643a",
    cream = "#fff1df",
    dark = "#4a2e26";
  const body = biped(p, {
    fur,
    cloth: "#f4ead6",
    trousers: dark,
    feet: dark,
    paws: dark,
    hip: 0.42,
  });
  const { hips, head, arms } = body;
  const apron = p.ball(0.25, "#7fa86a", 0, 0.2, 0.12, hips);
  apron.scale.set(0.95, 1.3, 0.45);
  p.ball(0.06, "#f4ead6", 0, 0.12, 0.25, hips).scale.z = 0.4;
  const scarf = p.add(
    new THREE.TorusGeometry(0.15, 0.055, 8, 20),
    "#3f8f8a",
    0,
    0.6,
    0.02,
    hips,
  );
  scarf.rotation.x = Math.PI / 2;
  p.add(
    new THREE.ConeGeometry(0.08, 0.16, 8),
    "#3f8f8a",
    0.06,
    0.52,
    0.16,
    hips,
  ).rotation.set(Math.PI, 0, 0.3);

  // A round rusty face with cream cheeks, brows and ear linings.
  const face = p.ball(0.31, fur, 0, 0, 0, head);
  face.scale.set(1.18, 0.95, 1);
  for (const side of [-1, 1]) {
    const cheek = p.ball(0.13, cream, side * 0.16, -0.08, 0.18, head);
    cheek.scale.set(1.1, 0.85, 0.8);
    const brow = p.ball(0.05, cream, side * 0.12, 0.15, 0.27, head);
    brow.scale.set(1.3, 0.75, 0.5);
    brow.castShadow = false;
    const ear = p.group(side * 0.22, 0.22, -0.02, head);
    ear.rotation.z = -side * 0.35;
    const outer = p.ball(0.11, fur, 0, 0.06, 0, ear);
    outer.scale.set(1, 1.05, 0.55);
    const inner = p.ball(0.075, cream, 0, 0.06, 0.04, ear);
    inner.scale.set(1, 1.05, 0.4);
    inner.castShadow = false;
  }
  const muzzle = p.ball(0.12, cream, 0, -0.09, 0.27, head);
  muzzle.scale.set(1.15, 0.8, 1.05);
  p.ball(0.036, "#3a2a26", 0, -0.05, 0.39, head).scale.set(1.25, 0.9, 0.9);
  p.eyes(head, { gap: 0.13, y: 0.05, z: 0.27, r: 0.062 });
  p.cheeks(head, { gap: 0.22, y: -0.08, z: 0.28 });
  p.smile(head, { y: -0.14, z: 0.37, r: 0.04 });

  // A big ringed tail, curling up behind.
  const tail = p.group(0, 0.1, -0.24, hips);
  for (let i = 0; i < 6; i++) {
    const y = i * 0.1,
      z = -0.08 - Math.sin(i * 0.5) * 0.24;
    p.ball(0.13 - i * 0.008, i % 2 ? "#e9a77a" : fur, 0, y, z, tail);
  }

  // The teapot, in its right paw.
  const pot = p.group(0, -0.29, 0.06, arms[1]);
  const potBody = p.ball(0.13, "#f4efe2", 0, 0, 0, pot);
  potBody.scale.set(1, 0.85, 1);
  p.tube(0.05, 0.07, 0.04, "#3f6fa8", 0, 0.11, 0, pot);
  p.ball(0.025, "#3f6fa8", 0, 0.15, 0, pot);
  p.tube(0.13, 0.13, 0.03, "#3f6fa8", 0, 0, 0, pot);
  const spout = p.tube(0.015, 0.03, 0.16, "#f4efe2", 0, 0.02, 0.15, pot);
  spout.rotation.x = 1;
  // The stream of tea from the spout, shown while it pours.
  const stream = p.tube(0.012, 0.012, 0.34, "#b9733a", 0, -0.14, 0.23, pot);
  stream.visible = false;
  stream.castShadow = false;

  const local = new THREE.Vector3();
  let look = 0,
    pouring = 0;
  return {
    group: root,
    // Pour for a few seconds.
    pour(seconds = 3) {
      pouring = seconds;
    },
    get pouring() {
      return pouring > 0;
    },
    animate(dt, time, friend) {
      pouring = Math.max(0, pouring - dt);
      const tilt =
        pouring > 0 ? Math.min(1, pouring * 2, (3 - pouring) * 3) : 0;
      body.pose(arms[1], 0.35 + tilt * 0.75, 0.1);
      body.pose(arms[0], 0.3 + Math.sin(time * 1.3) * 0.06, 0.2);
      pot.rotation.x = tilt * 0.9;
      stream.visible = tilt > 0.6;
      tail.rotation.y = Math.sin(time * 1.6) * 0.25;
      tail.rotation.x = Math.sin(time * 1.1) * 0.08;
      hips.position.y = 0.42 + Math.abs(Math.sin(time * 1.4)) * 0.01;
      local.copy(friend);
      root.worldToLocal(local);
      const near = Math.hypot(local.x, local.z) < 2.8 && local.z > -0.3;
      const want =
        pouring > 0
          ? 0.35
          : near
            ? THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.7, 0.7)
            : Math.sin(time * 0.4) * 0.2;
      look += (want - look) * 0.08;
      head.rotation.y = look;
      head.rotation.x = pouring > 0 ? 0.25 : 0;
    },
    reset() {
      pouring = 0;
    },
  };
}
