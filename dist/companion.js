import { createCharacterEyes } from "./character-eyes.js?v=20261003-hug";
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
  const eyes = createCharacterEyes({ body, ball, mesh });
  for (const side of [-1, 1]) {
    ball(0.12, "#f0bd8a", side * 0.49, 2.09, 0.13, body);
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
  const contactDistance = 1.2;
  const wanderRadius = 7;
  const maxDistance = 10;
  let wait = 0,
    walking = false,
    gait = 0,
    travelTime = 0;
  const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const flatGround = {
    contains: (x, z) => Math.hypot(x, z) < 48,
    heightAt: () => 0,
  };
  function clear(x, z, obstacles, terrain) {
    return (
      terrain.contains(x, z) &&
      obstacles.every(
        (b) =>
          b.active === false ||
          Math.hypot(x - b.x, z - b.z) >
            b.r + Math.max(0.65, b.minClearance ?? 0),
      )
    );
  }
  function reset(
    center = new THREE.Vector3(0, 0, 7),
    obstacles = [],
    terrain = flatGround,
  ) {
    // Rejoin beside her after returning from the cave or getting separated.
    for (let distance = 2.7; distance < maxDistance; distance += 0.7) {
      let found = false;
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI) / 12;
        const x = center.x + Math.cos(angle) * distance;
        const z = center.z + Math.sin(angle) * distance;
        if (clear(x, z, obstacles, terrain)) {
          character.position.set(x, terrain.heightAt(x, z), z);
          found = true;
          break;
        }
      }
      if (found) break;
    }
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
  function pause() {
    walking = false;
    wait = 1 + Math.random() * 2.5;
  }
  function blocksPlayer(position, previous) {
    if (horizontalDistance(position, character.position) >= contactDistance)
      return false;
    position.copy(previous);
    return true;
  }
  function update(dt, obstacles, heroPosition, terrain = flatGround) {
    let separation = horizontalDistance(character.position, heroPosition);
    // Catch up promptly when she leaves; wandering stays centered on her.
    if (separation > maxDistance) {
      reset(heroPosition, obstacles, terrain);
      separation = horizontalDistance(character.position, heroPosition);
    }
    const followDistance = terrain.followDistance ?? 5;
    const following = separation > followDistance;
    if (following) {
      destination.copy(heroPosition);
      walking = true;
      travelTime = 0;
    } else if (horizontalDistance(destination, heroPosition) > wanderRadius)
      pause();
    if (!walking) {
      wait -= dt;
      if (wait <= 0) {
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 2 + Math.random() * 2.5;
          const x = heroPosition.x + Math.sin(angle) * distance;
          const z = heroPosition.z + Math.cos(angle) * distance;
          if (clear(x, z, obstacles, terrain)) {
            destination.set(x, 0, z);
            walking = true;
            travelTime = 0;
            break;
          }
        }
        if (!walking) wait = 1;
      }
    }
    let moved = 0,
      bumped = false;
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
        character.rotation.y += THREE.MathUtils.clamp(
          turn,
          -dt * (following ? 6 : 2),
          dt * (following ? 6 : 2),
        );
        const speed = following
          ? Math.min(8.8, 1.05 + (separation - followDistance) * 2.5)
          : 1.05;
        const step =
          speed * dt * (following ? 1 : Math.abs(turn) < 0.35 ? 1 : 0);
        // Try nearby headings to go around rocks rather than getting stuck.
        for (const offset of step > 0 ? [0, 0.5, -0.5, 1, -1, 1.5, -1.5] : []) {
          const angle = (following ? heading : character.rotation.y) + offset;
          const x = character.position.x + Math.sin(angle) * step;
          const z = character.position.z + Math.cos(angle) * step;
          if (!clear(x, z, obstacles, terrain)) continue;
          if (
            Math.hypot(x - heroPosition.x, z - heroPosition.z) < contactDistance
          ) {
            bumped = true;
            pause();
            break;
          }
          if (
            !following &&
            Math.hypot(x - heroPosition.x, z - heroPosition.z) > wanderRadius
          )
            continue;
          character.position.set(x, terrain.heightAt(x, z), z);
          moved = step;
          travelTime += dt;
          break;
        }
        if (step > 0 && !moved && !bumped) pause();
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
    return bumped;
  }
  reset();
  return {
    character,
    update,
    reset,
    blocksPlayer,
    contactDistance,
    rig: { body, legs, arms, eyes },
  };
}
