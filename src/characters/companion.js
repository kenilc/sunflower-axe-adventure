import * as THREE from "three";
import { instantiateModel } from "../assets/models.js";
import { createCharacterRig } from "./rig.js";

// `random` lets tests make the companion's wandering repeatable.
export function createCompanion({ model, random = Math.random }) {
  const character = instantiateModel(model);
  const rig = createCharacterRig(character);
  const { body, legs, arms } = rig;
  const destination = new THREE.Vector3();
  const forward = new THREE.Vector3();
  // Closer than contactDistance they bump (and hearts may float up); closer
  // than bodyDistance she slides round him rather than walking through.
  const contactDistance = 1.2;
  const bodyDistance = 0.85;
  // Walking towards him, she would rather he stepped aside.
  const yieldAhead = 2.6;
  const yieldWidth = 1.3;
  const yieldSpeed = 3.6;
  const wanderRadius = 7;
  const maxDistance = 10;
  // He keeps up by speeding up as she pulls away, faster than her run near
  // the edge of his range. Placing him beside her is a last resort, for
  // when he stays out of range and stuck, or she jumps far away at once.
  const catchUpSpeed = 10.5;
  const stuckSeconds = 2.5;
  const jumpDistance = 20;
  // Her recent footsteps: where she walked is open ground, so when the way
  // straight to her is blocked he follows her trail instead.
  const trail = [];
  const trailSpacing = 0.6;
  const trailLength = 60;
  const trailClearance = 0.4;
  let wait = 0,
    walking = false,
    gait = 0,
    travelTime = 0,
    stuckTime = 0,
    trailTarget = null;
  const lastHero = new THREE.Vector3();
  let heroKnown = false;
  const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const flatGround = {
    contains: (x, z) => Math.hypot(x, z) < 48,
    heightAt: () => 0,
  };
  function clear(x, z, obstacles, terrain, clearance = 0.65) {
    return (
      terrain.contains(x, z) &&
      obstacles.every(
        (b) =>
          b.active === false ||
          Math.hypot(x - b.x, z - b.z) >
            b.r + Math.max(clearance, b.minClearance ?? 0),
      )
    );
  }
  function remember(heroPosition) {
    const last = trail.at(-1);
    // A jump (a gate, a ride, a restored checkpoint) is not a walkable trail.
    if (last && horizontalDistance(last, heroPosition) > 3) trail.length = 0;
    if (
      !trail.length ||
      horizontalDistance(trail.at(-1), heroPosition) > trailSpacing
    ) {
      trail.push(heroPosition.clone());
      if (trail.length > trailLength) trail.shift();
    }
  }
  function inSight(target, obstacles, terrain, clearance = trailClearance) {
    const from = character.position;
    const length = horizontalDistance(from, target);
    for (let travelled = 0.4; travelled < length; travelled += 0.4) {
      const t = travelled / length;
      if (
        !clear(
          from.x + (target.x - from.x) * t,
          from.z + (target.z - from.z) * t,
          obstacles,
          terrain,
          clearance,
        )
      )
        return false;
    }
    return true;
  }
  // The footstep closest to her that he can walk straight to.
  function trailStep(obstacles, terrain) {
    for (let i = trail.length - 1; i >= 0; i--)
      if (inSight(trail[i], obstacles, terrain)) return trail[i];
    return null;
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
    gait = travelTime = stuckTime = 0;
    heroKnown = false;
    trail.length = 0;
    trailTarget = null;
    body.position.y = 0;
    [...legs, ...arms].forEach((limb) => {
      limb.rotation.x = 0;
    });
  }
  function pause() {
    walking = false;
    wait = 1 + random() * 2.5;
  }
  // She slides round him like a soft round obstacle instead of stopping
  // dead. Returns whether they bumped.
  function blocksPlayer(position, previous) {
    const distance = horizontalDistance(position, character.position);
    if (distance >= bodyDistance) return false;
    let dx = position.x - character.position.x,
      dz = position.z - character.position.z;
    if (distance < 1e-6) {
      dx = previous.x - character.position.x;
      dz = previous.z - character.position.z;
    }
    const length = Math.hypot(dx, dz) || 1;
    position.x = character.position.x + (dx / length) * bodyDistance;
    position.z = character.position.z + (dz / length) * bodyDistance;
    return true;
  }
  // When she walks towards him, he steps out of her way: to the side he is
  // already on, else ahead of her, else the other side.
  function giveWay(dt, heroPosition, obstacles, terrain) {
    const moved = heroKnown
      ? horizontalDistance(heroPosition, lastHero) / Math.max(dt, 1e-6)
      : 0;
    const heading = new THREE.Vector3(
      heroPosition.x - lastHero.x,
      0,
      heroPosition.z - lastHero.z,
    );
    lastHero.copy(heroPosition);
    heroKnown = true;
    if (moved < 0.8 || moved > 20) return 0;
    heading.normalize();
    const rx = character.position.x - heroPosition.x,
      rz = character.position.z - heroPosition.z;
    const ahead = rx * heading.x + rz * heading.z;
    const side = rx * heading.z - rz * heading.x;
    if (ahead <= 0 || ahead > yieldAhead || Math.abs(side) > yieldWidth)
      return 0;
    const sign = side >= 0 ? 1 : -1;
    const across = new THREE.Vector3(heading.z * sign, 0, -heading.x * sign);
    const step = yieldSpeed * dt;
    for (const direction of [
      across,
      across.clone().add(heading).normalize(),
      heading,
      across.clone().negate(),
    ]) {
      const x = character.position.x + direction.x * step,
        z = character.position.z + direction.z * step;
      if (!clear(x, z, obstacles, terrain, trailClearance)) continue;
      if (Math.hypot(x - heroPosition.x, z - heroPosition.z) < bodyDistance)
        continue;
      character.position.set(x, terrain.heightAt(x, z), z);
      character.rotation.set(0, Math.atan2(direction.x, direction.z), 0);
      walking = false;
      wait = 0.6;
      trailTarget = null;
      return step;
    }
    return 0;
  }
  function update(dt, obstacles, heroPosition, terrain = flatGround) {
    let separation = horizontalDistance(character.position, heroPosition);
    stuckTime = separation > maxDistance ? stuckTime + dt : 0;
    if (separation > jumpDistance || stuckTime > stuckSeconds) {
      reset(heroPosition, obstacles, terrain);
      separation = horizontalDistance(character.position, heroPosition);
    }
    remember(heroPosition);
    const gaveWay = giveWay(dt, heroPosition, obstacles, terrain);
    const followDistance = terrain.followDistance ?? 5;
    const following = !gaveWay && separation > followDistance;
    if (following) {
      destination.copy(heroPosition);
      walking = true;
      travelTime = 0;
      // Out of sight around a corner or through a gap, he walks her trail
      // to the last footstep he can see, until he can see her again.
      if (inSight(heroPosition, obstacles, terrain, 0.65)) trailTarget = null;
      else if (
        !trailTarget ||
        horizontalDistance(character.position, trailTarget) < 0.3 ||
        !inSight(trailTarget, obstacles, terrain)
      )
        trailTarget = trailStep(obstacles, terrain);
      if (trailTarget) destination.copy(trailTarget);
    } else if (horizontalDistance(destination, heroPosition) > wanderRadius)
      pause();
    if (!walking && !gaveWay) {
      wait -= dt;
      if (wait <= 0) {
        for (let i = 0; i < 20; i++) {
          const angle = random() * Math.PI * 2;
          const distance = 2 + random() * 2.5;
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
    let moved = gaveWay,
      bumped = false;
    if (walking && !gaveWay) {
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
        // Far behind, he turns quicker and sets off before fully facing her.
        const hurry = following && separation > followDistance + 1.5;
        const turnRate = following ? (hurry ? 10 : 6) : 2;
        const turning = THREE.MathUtils.clamp(
          turn,
          -dt * turnRate,
          dt * turnRate,
        );
        character.rotation.set(0, currentHeading + turning, 0);
        const speed = following
          ? Math.min(catchUpSpeed, 1.05 + (separation - followDistance) * 3)
          : 1.05;
        const step =
          speed *
          dt *
          (Math.abs(turn - turning) < (hurry ? 0.6 : 0.35) ? 1 : 0);
        // On her trail he squeezes through wherever she fitted; otherwise he
        // keeps a wider berth.
        const clearance = trailTarget ? trailClearance : 0.65;
        // Try nearby headings to go around rocks rather than getting stuck.
        for (const offset of step > 0 ? [0, 0.5, -0.5, 1, -1, 1.5, -1.5] : []) {
          const angle = (following ? heading : character.rotation.y) + offset;
          const x = character.position.x + Math.sin(angle) * step;
          const z = character.position.z + Math.cos(angle) * step;
          if (!clear(x, z, obstacles, terrain, clearance)) continue;
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
        // While following, a blocked step only waits a moment: he tries
        // again (or takes her trail) next frame rather than standing idle.
        if (step > 0 && !moved && !bumped && !following) pause();
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
    bodyDistance,
    rig,
  };
}
