import * as THREE from "three";
import { createPoseHold } from "../polder/poses.js";

// Sizes from assets/blender/build_balloon.py: the basket is 1.5 square and
// 1.05 tall, so the friends stand in it with their legs hidden.
export const BALLOON = { floor: 0.3, gap: 0.34 };
const FLIGHT_SECONDS = 3.4,
  RISE_SPEED = 3.2;

// A hot-air balloon waiting on the ground. Boarding it stands the friends in
// the basket and lifts off; once aloft the scene moves on to `destination`.
// Each end of the flight has its own balloon.
export function createBalloonTrip(context, { balloon, destination }) {
  const pose = createPoseHold(context, `balloon-${destination}`);
  const ground = balloon.position.clone();
  let flying = 0,
    leaving = false;
  function stand() {
    pose.actors.forEach((actor, i) => {
      const local = new THREE.Vector3(
        (i ? 1 : -1) * BALLOON.gap,
        BALLOON.floor,
        0.1,
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), balloon.rotation.y);
      actor.position.copy(balloon.position).add(local);
      actor.rotation.set(0, balloon.rotation.y, 0);
    });
  }
  return {
    balloon,
    get flying() {
      return flying > 0;
    },
    board() {
      if (flying > 0) return false;
      flying = FLIGHT_SECONDS;
      leaving = false;
      context.clearRestInput();
      pose.hold(() => {});
      stand();
      return true;
    },
    // Runs instead of walking while they rise.
    move(dt) {
      if (flying <= 0) return false;
      flying -= dt;
      const ease = Math.min(1, (FLIGHT_SECONDS - flying) / 1.4);
      balloon.position.y += RISE_SPEED * ease * ease * dt;
      stand();
      if (flying < FLIGHT_SECONDS - 1.6 && !leaving) {
        leaving = true;
        // The scene fades and changes while they rise; if it can't, they
        // step back down onto the grass.
        if (!context.transitions.go(destination)) {
          this.reset();
          return false;
        }
      }
      return true;
    },
    // When the scene changes, the balloon settles back where it waited.
    reset() {
      flying = 0;
      leaving = false;
      pose.release();
      balloon.position.copy(ground);
    },
  };
}
