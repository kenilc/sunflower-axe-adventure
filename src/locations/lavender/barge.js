import * as THREE from "three";
import { instantiateModel } from "../../assets/models.js";
import { createPoseHold, sitPose } from "../polder/poses.js";

// Sizes from assets/blender/build_barge.py, in the barge's own frame with
// its bow along +Z: the bench at the bow, where the friends sit.
export const BARGE = { bench: { y: 0.75, z: 1.9 }, seatGap: 0.36 };
const HIP = 0.55;
const SAIL_SECONDS = 3.2,
  SAIL_SPEED = 4.2;

// A flower barge moored at a landing. Boarding it seats the friends on the
// bow bench and sails off along the water; once under way the scene moves
// on to `destination`. Each end of the trip has its own barge.
export function createBargeTrip(
  context,
  { parent, mooring, turn, destination },
) {
  const barge = instantiateModel(context.models.barge);
  barge.name = "barge";
  parent.add(barge);
  const pose = createPoseHold(context, `barge-${destination}`);
  const forward = new THREE.Vector3();
  let sailing = 0,
    leaving = false,
    elapsed = 0;
  function moor() {
    barge.position.copy(mooring);
    barge.rotation.set(0, turn, 0);
  }
  function seat() {
    pose.actors.forEach((actor, i) => {
      const local = new THREE.Vector3(
        (i ? 1 : -1) * BARGE.seatGap,
        BARGE.bench.y - HIP + 0.05,
        BARGE.bench.z,
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), barge.rotation.y);
      actor.position.copy(barge.position).add(local);
      actor.rotation.set(0, barge.rotation.y, 0);
    });
  }
  moor();
  return {
    barge,
    get sailing() {
      return sailing > 0;
    },
    board() {
      if (sailing > 0) return false;
      sailing = SAIL_SECONDS;
      leaving = false;
      context.clearRestInput();
      pose.hold((actor, rig) => sitPose(rig, 0.2));
      seat();
      return true;
    },
    // Runs instead of walking while they sail.
    move(dt) {
      if (sailing <= 0) return false;
      sailing -= dt;
      const ease = Math.min(1, (SAIL_SECONDS - sailing) / 1.2);
      forward.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
      barge.position.addScaledVector(forward, SAIL_SPEED * ease * dt);
      seat();
      if (sailing < SAIL_SECONDS - 1.6 && !leaving) {
        leaving = true;
        // The scene fades and changes while they sail; if it can't, they
        // step back onto the landing.
        if (!context.transitions.go(destination)) {
          this.reset();
          return false;
        }
      }
      return true;
    },
    animate(dt) {
      elapsed += dt;
      barge.position.y = mooring.y + Math.sin(elapsed * 1.3) * 0.03;
      barge.rotation.z = Math.sin(elapsed * 0.9) * 0.012;
    },
    // When the scene changes, the barge goes back to its landing.
    reset() {
      sailing = 0;
      leaving = false;
      pose.release();
      moor();
    },
  };
}
