import * as THREE from "three";

export const SNOWMAN_STEP_SECONDS = 6.5;
const heights = [0.8, 1.94, 2.84];
const radii = [0.9, 0.66, 0.46];
const smooth = (time, from, to) => THREE.MathUtils.smoothstep(time, from, to);
const mix = THREE.MathUtils.lerp;

// The snowball and the builders use the same timeline, so rolling and lifting
// put a real piece in place rather than scaling an entire finished snowman.
export function snowballPose(stage, progress) {
  if (stage === 0) {
    const travel = smooth(progress, 0, 0.72);
    const scale = mix(0.4, 1, smooth(progress, 0, 0.55));
    return {
      position: new THREE.Vector3(
        mix(-3.2, 0, travel),
        radii[0] * scale,
        mix(2.4, 0, travel),
      ),
      scale,
      rolling: travel * 5,
    };
  }
  const travel = smooth(progress, 0.32, 0.68);
  const lift = smooth(progress, 0.23, 0.68);
  return {
    position: new THREE.Vector3(
      mix(stage === 1 ? 2.8 : -2.7, 0, travel),
      mix(radii[stage], heights[stage], lift),
      mix(stage === 1 ? 2.1 : 1.5, 0, travel),
    ),
    scale: 1,
    rolling: 0,
  };
}

export function poseSnowmanBuilders({ actors, rigs, center, stage, progress }) {
  const ball = snowballPose(stage, progress);
  function pose(
    index,
    x,
    z,
    { walk = 0, bend = 0, reach = -0.2, target = ball.position } = {},
  ) {
    const actor = actors[index],
      rig = rigs[index];
    actor.position.set(center.x + x, 0, center.z + z);
    actor.rotation.set(0, Math.atan2(target.x - x, target.z - z), 0);
    const gait = Math.sin(progress * Math.PI * 8 + index * Math.PI);
    rig.body.position.set(0, Math.abs(gait) * 0.045 * walk - bend * 0.08, 0);
    rig.body.rotation.set(bend, 0, 0);
    rig.head.rotation.set(
      -bend * 0.4,
      Math.sin(progress * Math.PI * 2) * 0.06,
      0,
    );
    rig.legs.forEach((leg, side) => {
      leg.rotation.set((side ? -1 : 1) * gait * 0.4 * walk - bend * 0.12, 0, 0);
    });
    rig.feet.forEach((foot) => foot.rotation.set(bend * 0.12, 0, 0));
    rig.arms.forEach((arm, side) => {
      arm.rotation.set(reach + gait * 0.08 * walk, 0, side ? 0.12 : -0.12);
    });
  }
  if (stage === 0) {
    const finish = smooth(progress, 0.72, 1);
    // She pushes the growing ball; he walks alongside, packing its edges.
    pose(
      0,
      mix(ball.position.x - 1, -1.6, finish),
      mix(ball.position.z + 0.8, 1.3, finish),
      {
        walk: 1 - finish,
        bend: mix(0.55, 0.3, finish),
        reach: -0.85 - Math.sin(progress * Math.PI * 12) * 0.1,
      },
    );
    pose(
      1,
      mix(2.6, 1.6, smooth(progress, 0, 0.8)),
      mix(2.2, 1.1, smooth(progress, 0, 0.8)),
      {
        walk: 1 - smooth(progress, 0.65, 0.8),
        bend: 0.3 + Math.sin(progress * Math.PI * 6) * 0.12,
        reach: -0.7,
      },
    );
  } else if (stage === 1) {
    const collect = smooth(progress, 0, 0.22),
      carry = smooth(progress, 0.32, 0.72);
    // He fetches and lifts the middle; she circles the base and pats it firm.
    pose(
      1,
      mix(mix(1.6, 3.6, collect), 1.5, carry),
      mix(mix(1.1, 2.8, collect), 1.1, carry),
      {
        walk: progress < 0.22 || (progress > 0.32 && progress < 0.72) ? 1 : 0,
        bend:
          (smooth(progress, 0.18, 0.25) - smooth(progress, 0.3, 0.5)) * 0.45,
        reach: mix(-0.6, -1.8, smooth(progress, 0.23, 0.68)),
      },
    );
    const circle = Math.sin(progress * Math.PI);
    pose(0, -1.6 - circle * 0.65, 1.3 - circle * 1.5, {
      walk: progress < 0.88 ? 0.7 : 0,
      bend: 0.3 + Math.sin(progress * Math.PI * 8) * 0.1,
      reach: -0.75,
      target: new THREE.Vector3(0, 0.8, 0),
    });
  } else {
    const collect = smooth(progress, 0, 0.2),
      carry = smooth(progress, 0.3, 0.68);
    // She carries the head and reaches up; he adds the face, scarf and hat.
    pose(
      0,
      mix(mix(-1.6, -3.5, collect), -1.6, carry),
      mix(mix(1.3, 2.1, collect), 1.3, carry),
      {
        walk: progress < 0.2 || (progress > 0.3 && progress < 0.68) ? 1 : 0,
        bend:
          (smooth(progress, 0.16, 0.23) - smooth(progress, 0.27, 0.42)) * 0.45,
        reach: mix(-0.7, -2.25, smooth(progress, 0.23, 0.68)),
      },
    );
    const decorate = smooth(progress, 0.65, 0.78),
      cheer = smooth(progress, 0.92, 1);
    pose(
      1,
      1.5 + Math.sin(progress * Math.PI) * 0.3,
      1.1 + Math.sin(progress * Math.PI * 2) * 0.3,
      {
        walk: 0.5 * (1 - decorate),
        reach: mix(
          -0.3,
          -1.8 - Math.sin(progress * Math.PI * 10) * 0.35,
          decorate,
        ),
        target: new THREE.Vector3(0, 2.7, 0),
      },
    );
    rigs.forEach((rig, index) => {
      rig.arms[index].rotation.x = mix(rig.arms[index].rotation.x, -2.7, cheer);
      rig.body.position.y += Math.sin(cheer * Math.PI) * 0.07;
    });
  }
}
