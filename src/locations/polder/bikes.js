import * as THREE from "three";
import { resolveObstacleCollisions } from "../../systems/collision.js";
import { createPoseHold } from "./poses.js";

// Sizes from assets/blender/build_bicycle.py, in the bike's own frame with
// its front along +Z: the saddle sits behind the pedals, the grips ahead.
export const BICYCLE = {
  saddle: { z: -0.22, y: 0.98 },
  wheel: 0.4,
  length: 1.9,
};
const HIP = 0.55; // the friends' hips above their feet
const SPEED = 5.8,
  FAST_SPEED = 8.6,
  TURN_RATE = 2.8,
  RADIUS = 0.7,
  // His bike keeps this far behind hers along the path she rode.
  FOLLOW_GAP = 2.8,
  // The closest his bike comes to hers.
  GAP = 1.5,
  FOOTPRINT = 0.6;
const UP = new THREE.Vector3(0, 1, 0);

// Cycling round the polder: each friend rides a bike from the shed. She
// steers with the walking controls; his bike follows the path hers took, so
// it goes round the strips and over the bridge behind her.
export function createBikeRide(context, world) {
  const { hero, companion } = context;
  const pose = createPoseHold(context, "polder-bikes");
  // world.bikes[0] is hers (it leads) and world.bikes[1] his.
  const lead = () => world.bikes[0],
    follower = () => world.bikes[1];
  const trail = [];
  const offset = new THREE.Vector3();
  let riding = false,
    speed = 0,
    followSpeed = 0;

  function seat(bike, actor) {
    const { x, z } = bike.group.position;
    const turn = bike.group.rotation.y;
    offset.set(0, 0, BICYCLE.saddle.z).applyAxisAngle(UP, turn);
    actor.position.set(
      x + offset.x,
      BICYCLE.saddle.y - HIP + 0.03,
      z + offset.z,
    );
    actor.rotation.set(0, turn, 0);
  }
  // The bike takes up a round patch of ground, the same whichever way it
  // faces, so turning on the spot never gets it stuck. Too wide for the
  // furrows between the tulips, it keeps to the paths and grass.
  function fits(x, z) {
    return [
      [0, 0],
      [FOOTPRINT, 0],
      [-FOOTPRINT, 0],
      [0, FOOTPRINT],
      [0, -FOOTPRINT],
    ].every(([dx, dz]) => world.contains(x + dx, z + dz));
  }
  function syncBlockers() {
    for (const bike of world.bikes) {
      bike.blocker.x = bike.group.position.x;
      bike.blocker.z = bike.group.position.z;
    }
  }
  function steer(dt) {
    // Input is set up after the places, so read it when steering.
    const { keys, joy } = context;
    const input = new THREE.Vector3(
      (keys.KeyD || keys.ArrowRight ? 1 : 0) -
        (keys.KeyA || keys.ArrowLeft ? 1 : 0) +
        joy.x,
      0,
      (keys.KeyS || keys.ArrowDown ? 1 : 0) -
        (keys.KeyW || keys.ArrowUp ? 1 : 0) +
        joy.y,
    );
    if (input.length() > 1) input.normalize();
    input.applyAxisAngle(UP, context.state.yaw);
    const throttle = input.length();
    const target =
      (keys.ShiftLeft || keys.ShiftRight ? FAST_SPEED : SPEED) * throttle;
    speed += (target - speed) * (1 - Math.exp(-dt * 2.5));
    const bike = lead().group;
    if (throttle > 0.05) {
      // Turn towards the pressed direction, like steering handlebars.
      const heading = Math.atan2(input.x, input.z);
      const turn = Math.atan2(
        Math.sin(heading - bike.rotation.y),
        Math.cos(heading - bike.rotation.y),
      );
      bike.rotation.y += THREE.MathUtils.clamp(
        turn,
        -TURN_RATE * dt,
        TURN_RATE * dt,
      );
    }
    const old = bike.position.clone();
    // Her bike bumps into trees, posts and buildings, but never his bike:
    // his keeps out of her way instead, so the two can't wedge her in.
    const others = world.blockers.filter(
      (blocker) => blocker !== lead().blocker && blocker !== follower().blocker,
    );
    // Straight on if she can; if not, glance off at an angle, as the
    // companion does round rocks, rather than stopping dead.
    const step = speed * dt;
    let moved = false;
    // Sliding along an edge keeps half her speed rather than crawling, and
    // a straight sideways shuffle gets her out of a corner.
    for (const offset of [
      0,
      0.45,
      -0.45,
      0.9,
      -0.9,
      1.3,
      -1.3,
      Math.PI / 2,
      -Math.PI / 2,
    ]) {
      const angle = bike.rotation.y + offset;
      const next = old
        .clone()
        .add(
          new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(
            step * Math.max(Math.cos(offset), 0.5),
          ),
        );
      if (!resolveObstacleCollisions(next, old, others, RADIUS)) continue;
      if (!fits(next.x, next.z)) continue;
      bike.position.copy(next);
      moved = true;
      break;
    }
    if (!moved) speed *= 0.5;
    const last = trail.at(-1);
    if (!last || last.distanceTo(bike.position) > 0.25) {
      trail.push(bike.position.clone());
      if (trail.length > 80) trail.shift();
    }
    return bike.position.distanceTo(old);
  }
  function follow(dt) {
    // The point FOLLOW_GAP back along her path, measured from where she is
    // now, so it glides along rather than jumping a trail point at a time.
    const path = [lead().group.position, ...trail.toReversed()];
    let remaining = FOLLOW_GAP,
      target = path.at(-1);
    for (let i = 1; i < path.length; i++) {
      const step = path[i - 1].distanceTo(path[i]);
      if (step >= remaining) {
        target = path[i - 1].clone().lerp(path[i], remaining / step);
        break;
      }
      remaining -= step;
    }
    const bike = follower().group;
    const dx = target.x - bike.position.x,
      dz = target.z - bike.position.z;
    const distance = Math.hypot(dx, dz);
    // His own speed eases towards what keeps him on that point, so he
    // pedals steadily instead of lurching.
    const wanted = Math.min(distance * 6, FAST_SPEED * 1.3);
    followSpeed += (wanted - followSpeed) * (1 - Math.exp(-dt * 5));
    const move = Math.min(distance, followSpeed * dt);
    if (move < 1e-4) return 0;
    bike.position.x += (dx / distance) * move;
    bike.position.z += (dz / distance) * move;
    // Face the way he is going, turning gently.
    const heading = Math.atan2(dx, dz);
    const turn = Math.atan2(
      Math.sin(heading - bike.rotation.y),
      Math.cos(heading - bike.rotation.y),
    );
    if (distance > 0.2) bike.rotation.y += turn * (1 - Math.exp(-dt * 4));
    return move;
  }
  // His bike never sits on hers: it is pushed out to a little gap, onto
  // open ground on whichever side has room.
  function keepClear(bike) {
    const ahead = lead().group;
    const away = bike.position.clone().sub(ahead.position).setY(0);
    if (away.length() >= GAP) return;
    if (away.lengthSq() < 1e-6)
      away.set(Math.cos(ahead.rotation.y), 0, -Math.sin(ahead.rotation.y));
    away.normalize();
    const side = new THREE.Vector3(away.z, 0, -away.x);
    for (const direction of [away, side, side.clone().negate()]) {
      const x = ahead.position.x + direction.x * GAP,
        z = ahead.position.z + direction.z * GAP;
      if (world.contains(x, z)) {
        bike.position.set(x, 0, z);
        return;
      }
    }
    bike.position.set(
      ahead.position.x + away.x * GAP,
      0,
      ahead.position.z + away.z * GAP,
    );
  }
  // Wheels roll with the distance travelled; the pedals turn with them.
  function roll(bike, distance) {
    for (const wheel of bike.wheels)
      wheel.rotation.x += distance / BICYCLE.wheel;
    bike.crank.rotation.x += distance / BICYCLE.wheel / 1.6;
  }
  function pedalPose(rig, crank) {
    const push = Math.sin(crank) * 0.45;
    rig.legs[0].rotation.set(-0.95 + push, 0, 0);
    rig.legs[1].rotation.set(-0.95 - push, 0, 0);
    rig.feet.forEach((foot) => (foot.rotation.x = 0.9));
  }
  return {
    get riding() {
      return riding;
    },
    nearby(position) {
      return world.bikes.some(
        (bike) =>
          Math.hypot(
            position.x - bike.group.position.x,
            position.z - bike.group.position.z,
          ) < 2.6,
      );
    },
    start() {
      if (riding) return false;
      riding = true;
      speed = followSpeed = 0;
      trail.length = 0;
      // Bikes still in the shed are wheeled out onto the path first.
      world.bikes.forEach((bike, i) => {
        const { home } = bike;
        if (
          bike.group.position.x === home.x &&
          bike.group.position.z === home.z
        ) {
          const start = world.rideStart[i];
          bike.group.position.set(start.x, 0, start.z);
          bike.group.rotation.set(0, start.turn, 0);
        }
      });
      syncBlockers();
      pose.hold((actor, rig) => {
        rig.body.position.set(0, 0, 0);
        rig.body.rotation.set(0, 0, 0);
        rig.arms.forEach((arm, j) =>
          arm.rotation.set(-0.8, 0, j ? 0.12 : -0.12),
        );
        pedalPose(rig, 0);
      });
      seat(lead(), hero);
      seat(follower(), companion.character);
      // Seed his trail so he waits until she sets off.
      trail.push(follower().group.position.clone());
      trail.push(lead().group.position.clone());
      return true;
    },
    stop() {
      if (!riding) return false;
      riding = false;
      speed = 0;
      pose.release(false);
      // Step off beside each bike, on open ground.
      world.bikes.forEach((bike, i) => {
        const actor = pose.actors[i];
        const side = new THREE.Vector3(1.1, 0, 0).applyAxisAngle(
          UP,
          bike.group.rotation.y,
        );
        for (const sign of [1, -1]) {
          const x = bike.group.position.x + side.x * sign,
            z = bike.group.position.z + side.z * sign;
          if (world.contains(x, z)) {
            actor.position.set(x, 0, z);
            break;
          }
        }
      });
      companion.reset(hero.position, world.blockers, world);
      return true;
    },
    // Runs instead of walking while they ride.
    move(dt) {
      if (!riding) return false;
      const ridden = steer(dt);
      const followed = follow(dt);
      keepClear(follower().group);
      syncBlockers();
      roll(lead(), ridden);
      roll(follower(), followed);
      seat(lead(), hero);
      seat(follower(), companion.character);
      pedalPose(pose.rigs[0], lead().crank.rotation.x);
      pedalPose(pose.rigs[1], follower().crank.rotation.x);
      return true;
    },
    reset() {
      if (riding) this.stop();
      world.resetBikes();
      syncBlockers();
    },
  };
}
