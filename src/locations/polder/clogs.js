import * as THREE from "three";
import { resolveObstacleCollisions } from "../../systems/collision.js";
import { createPoseHold, sitPose } from "./poses.js";

const SPEED = 5.6,
  RUN_SPEED = 8.2,
  TURN_RATE = 3.2,
  CLOG_RADIUS = 1.05,
  // His clog keeps this far behind hers along the path she drove.
  FOLLOW_GAP = 3.1;

// Riding the giant clogs: each friend sits in one and they trundle around
// the polder. She steers with the walking controls; his clog follows the
// path hers took, so it goes round strips and over the bridge behind her.
export function createClogRide(context, world) {
  const { hero, companion } = context;
  const pose = createPoseHold(context, "polder-clogs");
  // world.clogs[0] is hers (it leads) and world.clogs[1] his.
  const lead = () => world.clogs[0],
    follower = () => world.clogs[1];
  const trail = [];
  let riding = false,
    elapsed = 0,
    speed = 0;
  const forward = new THREE.Vector3();

  function seat(clog, actor) {
    actor.position.set(clog.group.position.x, 0.42, clog.group.position.z);
    // The clog's toe points along its local +Z; they face the toe.
    actor.rotation.set(0, clog.group.rotation.y, 0);
    actor.position.add(
      forward.set(0, 0, -0.45).applyAxisAngle(UP_AXIS, clog.group.rotation.y),
    );
  }
  function fits(x, z) {
    // The clog's toe, heel and middle must all be on open ground.
    return [-0.9, 0, 0.9].every((along) =>
      world.contains(
        x + Math.sin(lead().group.rotation.y) * along,
        z + Math.cos(lead().group.rotation.y) * along,
      ),
    );
  }
  function syncBlockers() {
    for (const clog of world.clogs) {
      clog.blocker.x = clog.group.position.x;
      clog.blocker.z = clog.group.position.z;
    }
  }
  function steer(dt) {
    // Input is set up after the places, so read it when steering.
    const { keys, joy } = context;
    let dx =
        (keys.KeyD || keys.ArrowRight ? 1 : 0) -
        (keys.KeyA || keys.ArrowLeft ? 1 : 0) +
        joy.x,
      dz =
        (keys.KeyS || keys.ArrowDown ? 1 : 0) -
        (keys.KeyW || keys.ArrowUp ? 1 : 0) +
        joy.y;
    const input = new THREE.Vector3(dx, 0, dz);
    if (input.length() > 1) input.normalize();
    input.applyAxisAngle(UP_AXIS, context.state.yaw);
    const throttle = input.length();
    const target =
      (keys.ShiftLeft || keys.ShiftRight ? RUN_SPEED : SPEED) * throttle;
    speed += (target - speed) * (1 - Math.exp(-dt * 3));
    const clog = lead().group;
    if (throttle > 0.05) {
      // Turn towards the pressed direction, like steering a little cart.
      const heading = Math.atan2(input.x, input.z);
      const turn = Math.atan2(
        Math.sin(heading - clog.rotation.y),
        Math.cos(heading - clog.rotation.y),
      );
      clog.rotation.y += THREE.MathUtils.clamp(
        turn,
        -TURN_RATE * dt,
        TURN_RATE * dt,
      );
    }
    const old = clog.position.clone();
    clog.position.x += Math.sin(clog.rotation.y) * speed * dt;
    clog.position.z += Math.cos(clog.rotation.y) * speed * dt;
    // Her clog bumps into everything, his clog included, but not itself.
    const others = world.blockers.filter(
      (blocker) => blocker !== lead().blocker,
    );
    resolveObstacleCollisions(clog.position, old, others, CLOG_RADIUS);
    if (!fits(clog.position.x, clog.position.z)) {
      clog.position.copy(old);
      speed *= 0.5;
    }
    const last = trail.at(-1);
    if (!last || last.distanceTo(clog.position) > 0.25) {
      trail.push(clog.position.clone());
      if (trail.length > 80) trail.shift();
    }
  }
  function follow(dt) {
    // The point FOLLOW_GAP back along her clog's path.
    let remaining = FOLLOW_GAP,
      target = trail[0] ?? lead().group.position;
    for (let i = trail.length - 1; i > 0; i--) {
      const step = trail[i].distanceTo(trail[i - 1]);
      if (step >= remaining) {
        target = trail[i].clone().lerp(trail[i - 1], remaining / step);
        break;
      }
      remaining -= step;
    }
    const clog = follower().group;
    const dx = target.x - clog.position.x,
      dz = target.z - clog.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.05) {
      const move = Math.min(distance, (Math.abs(speed) + 2) * dt * 1.4);
      clog.position.x += (dx / distance) * move;
      clog.position.z += (dz / distance) * move;
      const heading = Math.atan2(dx, dz);
      const turn = Math.atan2(
        Math.sin(heading - clog.rotation.y),
        Math.cos(heading - clog.rotation.y),
      );
      clog.rotation.y += turn * (1 - Math.exp(-dt * 6));
    }
  }
  function bob(clog, phase, moving) {
    clog.group.position.y = moving
      ? Math.abs(Math.sin(elapsed * 9 + phase)) * 0.06
      : 0;
    clog.group.rotation.z = moving ? Math.sin(elapsed * 9 + phase) * 0.04 : 0;
  }
  return {
    get riding() {
      return riding;
    },
    nearby(position) {
      return world.clogs.some(
        (clog) =>
          Math.hypot(
            position.x - clog.group.position.x,
            position.z - clog.group.position.z,
          ) < 2.6,
      );
    },
    start() {
      if (riding) return false;
      riding = true;
      speed = 0;
      trail.length = 0;
      // She takes the nearer clog; it leads.
      const near = world.clogs.toSorted(
        (a, b) =>
          a.group.position.distanceTo(hero.position) -
          b.group.position.distanceTo(hero.position),
      );
      if (near[0] !== lead()) world.clogs.reverse();
      pose.hold((actor, rig) => sitPose(rig, 0.2));
      // Seed his trail so he sits still until she drives off.
      trail.push(world.clogs[1].group.position.clone());
      trail.push(world.clogs[0].group.position.clone());
      return true;
    },
    stop() {
      if (!riding) return false;
      riding = false;
      speed = 0;
      for (const clog of world.clogs) bob(clog, 0, false);
      pose.release(false);
      // Step out beside each clog, on open ground.
      world.clogs.forEach((clog, i) => {
        const actor = pose.actors[i];
        const side = new THREE.Vector3(1.7, 0, 0).applyAxisAngle(
          UP_AXIS,
          clog.group.rotation.y,
        );
        for (const sign of [1, -1]) {
          const x = clog.group.position.x + side.x * sign,
            z = clog.group.position.z + side.z * sign;
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
      elapsed += dt;
      steer(dt);
      follow(dt);
      syncBlockers();
      const moving = Math.abs(speed) > 0.3;
      bob(world.clogs[0], 0, moving);
      bob(world.clogs[1], 1.3, moving);
      seat(world.clogs[0], hero);
      seat(world.clogs[1], companion.character);
      hero.position.y += world.clogs[0].group.position.y;
      companion.character.position.y += world.clogs[1].group.position.y;
      return true;
    },
    reset() {
      if (riding) this.stop();
      world.resetClogs();
      syncBlockers();
    },
  };
}

const UP_AXIS = new THREE.Vector3(0, 1, 0);
