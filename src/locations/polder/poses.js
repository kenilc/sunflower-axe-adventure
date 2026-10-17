import * as THREE from "three";

// Holds both friends in a pose for a polder moment (riding the clogs,
// sitting at the kitchen table) and puts their walking pose back after.
export function createPoseHold(context, key) {
  const actors = [context.hero, context.companion.character];
  const rigs = [context.heroRig, context.companion.rig];
  let saved = null,
    releases = [];
  const capture = (node) => ({
    node,
    position: node.position.clone(),
    quaternion: node.quaternion.clone(),
  });
  function restore({ node, position, quaternion }) {
    node.position.copy(position);
    node.quaternion.copy(quaternion);
  }
  return {
    actors,
    rigs,
    get held() {
      return saved !== null;
    },
    // `pose(actor, rig, index)` places each friend; index 0 is the heroine.
    hold(pose) {
      if (saved) this.release(false);
      saved = [
        ...actors.map(capture),
        ...rigs.flatMap((rig) =>
          [rig.body, rig.head, ...rig.legs, ...rig.arms, ...rig.feet].map(
            capture,
          ),
        ),
      ];
      actors.forEach((actor, i) => {
        rigs[i].items.setHidden(key, true);
        releases.push(rigs[i].appearance.override({ expression: "happy" }));
        pose(actor, rigs[i], i);
      });
    },
    // Walking resumes where they are now, not where the moment began.
    release(restoreActors = true) {
      if (!saved) return false;
      const positions = actors.map((actor) => actor.position.clone());
      const headings = actors.map((actor) => actor.rotation.y);
      saved.forEach(restore);
      if (!restoreActors)
        actors.forEach((actor, i) => {
          actor.position.copy(positions[i]).setY(0);
          actor.rotation.set(0, headings[i], 0);
        });
      saved = null;
      releases.forEach((release) => release());
      releases = [];
      rigs.forEach((rig) => rig.items.setHidden(key, false));
      return true;
    },
  };
}

// Knees bent and feet forward, as on a bench or a chair.
export function sitPose(rig, legLift = 0.18) {
  rig.body.position.set(0, 0, 0);
  rig.body.rotation.set(0, 0, 0);
  rig.legs.forEach((leg) => {
    leg.position.y += legLift;
    leg.rotation.set(-1.25, 0, 0);
  });
  rig.feet.forEach((foot) => (foot.rotation.x = 1.25));
  rig.arms.forEach((arm, j) => arm.rotation.set(-0.45, 0, j ? 0.12 : -0.12));
}

export const UP = new THREE.Vector3(0, 1, 0);
