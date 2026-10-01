import * as THREE from "./vendor/three.module.js";

// Use the hero's geometry and materials for a matching garden companion.
export function createCompanion({ ball, box, cyl, mesh }) {
  const character = new THREE.Group();
  const body = new THREE.Group();
  character.add(body);
  const legs = [],
    arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.22, 0.55, 0);
    body.add(leg);
    box(0.32, 0.65, 0.34, "#30343c", 0, -0.14, 0, leg);
    box(0.37, 0.35, 0.55, "#292e35", 0, -0.43, 0.1, leg);
    legs.push(leg);
    const arm = new THREE.Group();
    arm.position.set(side * 0.5, 1.55, 0);
    body.add(arm);
    box(0.32, 0.65, 0.35, "#353a44", side * 0.09, -0.25, 0, arm);
    for (let i = 0; i < 2; i++)
      box(0.34, 0.04, 0.37, "#292e37", side * 0.09, -0.15 - i * 0.23, 0, arm);
    ball(0.17, "#f0bd8a", side * 0.1, -0.63, 0.03, arm);
    arms.push(arm);
  }
  cyl(0.46, 0.6, 1.05, "#353a44", 0, 1.17, 0, body);
  // Horizontal quilt seams, a zipper and two backpack straps.
  for (let i = 0; i < 3; i++)
    cyl(
      0.5 + i * 0.035,
      0.5 + i * 0.035,
      0.045,
      "#292e37",
      0,
      1.47 - i * 0.27,
      0,
      body,
    );
  box(0.035, 0.93, 0.04, "#88908e", 0, 1.18, 0.51, body);
  const pack = ball(0.48, "#282d34", 0, 1.22, -0.4, body);
  pack.scale.set(0.88, 1.12, 0.5);
  for (const side of [-1, 1]) {
    const strap = box(
      0.11,
      0.88,
      0.07,
      "#605a50",
      side * 0.35,
      1.25,
      0.38,
      body,
    );
    strap.rotation.z = side * 0.12;
  }
  cyl(0.35, 0.4, 0.22, "#464953", 0, 1.72, 0.03, body);
  ball(0.57, "#352f2c", 0, 2.1, 0, body);
  ball(0.49, "#f0bd8a", 0, 2.12, 0.23, body);
  for (const side of [-1, 1]) {
    ball(0.12, "#f0bd8a", side * 0.49, 2.09, 0.13, body);
    ball(0.077, "#302d25", side * 0.19, 2.15, 0.672, body);
    ball(0.022, "#fff9dd", side * 0.19 - 0.015, 2.175, 0.733, body);
    const blush = ball(0.075, "#df967c", side * 0.31, 2, 0.61, body);
    blush.scale.y = 0.4;
    const glasses = mesh(
      new THREE.TorusGeometry(0.17, 0.035, 5, 8),
      "#22262b",
      side * 0.21,
      2.16,
      0.704,
      body,
    );
    glasses.scale.set(1.1, 0.87, 1);
    box(0.05, 0.045, 0.38, "#22262b", side * 0.43, 2.19, 0.46, body);
    box(0.18, 0.04, 0.04, "#47352b", side * 0.2, 2.37, 0.63, body);
  }
  box(0.1, 0.045, 0.05, "#22262b", 0, 2.18, 0.73, body);
  const smile = mesh(
    new THREE.TorusGeometry(0.09, 0.016, 5, 12, Math.PI),
    "#845340",
    0,
    2.01,
    0.699,
    body,
  );
  smile.rotation.z = Math.PI;
  const hat = ball(0.61, "#30313a", 0, 2.47, 0, body);
  hat.scale.set(1, 0.65, 0.92);
  cyl(0.58, 0.58, 0.21, "#252832", 0, 2.46, 0, body, 12);
  // A small stitched patch keeps the beanie readable at game scale.
  box(0.2, 0.12, 0.035, "#c8c7bd", -0.19, 2.47, 0.553, body);

  const destination = new THREE.Vector3();
  let wait = 0,
    walking = false,
    gait = 0,
    travelTime = 0;
  const speed = 1.05;
  function reset() {
    character.position.set(2.7, 0, 7.4);
    character.rotation.y = 0;
    destination.copy(character.position);
    wait = 0.8;
    walking = false;
    gait = travelTime = 0;
    body.position.y = 0;
    [...legs, ...arms].forEach((limb) => {
      limb.rotation.x = 0;
    });
  }
  function clear(x, z, obstacles, heroPosition) {
    return (
      Math.hypot(x, z - 7) < 13 &&
      Math.hypot(x - heroPosition.x, z - heroPosition.z) > 1.25 &&
      obstacles.every((b) => Math.hypot(x - b.x, z - b.z) > b.r + 0.65)
    );
  }
  function pause() {
    walking = false;
    wait = 1 + Math.random() * 2.5;
  }
  function update(dt, obstacles, heroPosition) {
    if (!walking) {
      wait -= dt;
      if (wait <= 0) {
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 2 + Math.random() * 4;
          const x = character.position.x + Math.sin(angle) * distance;
          const z = character.position.z + Math.cos(angle) * distance;
          if (clear(x, z, obstacles, heroPosition)) {
            destination.set(x, 0, z);
            walking = true;
            travelTime = 0;
            break;
          }
        }
        if (!walking) wait = 1;
      }
    }
    let moved = 0;
    if (walking) {
      const dx = destination.x - character.position.x;
      const dz = destination.z - character.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.12 || travelTime > 9) pause();
      else {
        const heading = Math.atan2(dx, dz);
        const turn = Math.atan2(
          Math.sin(heading - character.rotation.y),
          Math.cos(heading - character.rotation.y),
        );
        character.rotation.y += THREE.MathUtils.clamp(turn, -dt * 2, dt * 2);
        // Turn before stepping, then follow the current facing direction.
        const step = speed * dt * Math.max(0, Math.cos(turn));
        const x = character.position.x + Math.sin(character.rotation.y) * step;
        const z = character.position.z + Math.cos(character.rotation.y) * step;
        if (clear(x, z, obstacles, heroPosition)) {
          character.position.set(x, 0, z);
          moved = step;
          travelTime += dt;
        } else pause();
      }
    }
    gait += moved * 5;
    const swing = moved > 0 ? Math.sin(gait) * 0.32 : 0;
    const blend = 1 - Math.exp(-dt * 10);
    legs.forEach((leg, i) => {
      leg.rotation.x = THREE.MathUtils.lerp(
        leg.rotation.x,
        i ? -swing : swing,
        blend,
      );
      arms[i].rotation.x = -leg.rotation.x * 0.65;
    });
    body.position.y = THREE.MathUtils.lerp(
      body.position.y,
      moved > 0 ? Math.abs(Math.sin(gait)) * 0.035 : 0,
      blend,
    );
  }
  reset();
  return { character, update, reset };
}
