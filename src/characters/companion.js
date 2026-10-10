import * as THREE from "three";
import { instantiateModel } from "../assets/models.js";
import { createCharacterRig } from "./rig.js";

export function createCompanion({ model }) {
  const character = instantiateModel(model);
  const rig = createCharacterRig(character);
  const { body, legs, arms } = rig;
  const destination = new THREE.Vector3();
  const forward = new THREE.Vector3();
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
    character.rotation.set(0, 0, 0);
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
        // Activity/photo restoration may express an upright quaternion with
        // X and Z both at PI. Read its actual forward direction, not Euler Y.
        forward.set(0, 0, 1).applyQuaternion(character.quaternion);
        const currentHeading = Math.atan2(forward.x, forward.z);
        const turn = Math.atan2(
          Math.sin(heading - currentHeading),
          Math.cos(heading - currentHeading),
        );
        const turning = THREE.MathUtils.clamp(
          turn,
          -dt * (following ? 6 : 2),
          dt * (following ? 6 : 2),
        );
        character.rotation.set(0, currentHeading + turning, 0);
        const speed = following
          ? Math.min(8.8, 1.05 + (separation - followDistance) * 2.5)
          : 1.05;
        const step = speed * dt * (Math.abs(turn - turning) < 0.35 ? 1 : 0);
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
          // Obstacle avoidance may choose a different path from the target
          // heading. Face the accepted step so he never slides backward.
          character.rotation.set(0, angle, 0);
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
    rig,
  };
}
