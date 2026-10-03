import * as THREE from "./vendor/three.module.js";

export function createBedRest({
  bed,
  terrain,
  hero,
  heroRig,
  companion,
  toast,
}) {
  const characters = [hero, companion.character],
    rigs = [heroRig, companion.rig];
  const armPositions = rigs.map((rig) =>
    rig.arms.map((arm) => arm.position.clone()),
  );
  let resting = false,
    elapsed = 0;
  function restorePose() {
    characters.forEach((c) => c.rotation.set(0, Math.PI, 0));
    rigs.forEach((rig, i) => {
      rig.body.position.set(0, 0, 0);
      rig.body.rotation.set(0, 0, 0);
      [...rig.legs, ...rig.arms].forEach((limb) => limb.rotation.set(0, 0, 0));
      rig.legs.forEach((leg) => (leg.children[1].rotation.x = 0));
      rig.arms.forEach((arm, j) => arm.position.copy(armPositions[i][j]));
      rig.eyes.setClosed(false);
      if (rig.held) rig.held.visible = false;
    });
  }
  return {
    get resting() {
      return resting;
    },
    start() {
      if (resting) return false;
      resting = true;
      elapsed = 0;
      restorePose();
      const sides =
        hero.position.x <= companion.character.position.x ? [-1, 1] : [1, -1];
      characters.forEach((c, i) => {
        c.position
          .copy(bed.group.position)
          .add(new THREE.Vector3(sides[i] * 0.8, 1.8, 1.1));
        // Both lie along the bed, rolled toward each other with a slight
        // upward tilt so the closed eyes remain visible above the pillows.
        const angle = THREE.MathUtils.degToRad(20);
        const right = new THREE.Vector3(
          Math.sin(angle),
          sides[i] * Math.cos(angle),
          0,
        );
        const up = new THREE.Vector3(0, 0, -1);
        const front = new THREE.Vector3(
          -sides[i] * Math.cos(angle),
          Math.sin(angle),
          0,
        );
        c.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(right, up, front),
        );
        const rig = rigs[i];
        rig.eyes.setClosed(true);
        rig.arms.forEach((arm, j) => {
          arm.position.x *= 0.8;
          arm.position.y -= 0.3;
          arm.position.z += 0.4;
          arm.rotation.set(-1.25, 0, (j ? -1 : 1) * 0.1);
        });
        rig.legs.forEach((leg) => {
          leg.rotation.x = 0.18;
          leg.children[1].rotation.x = -0.18;
        });
      });
      bed.sleepSymbols.forEach((s) => (s.visible = true));
      toast("A sleepy hug together ♥ · X or Get up to leave the bed.");
      return true;
    },
    stand(notify = true) {
      if (!resting) return false;
      resting = false;
      restorePose();
      characters.forEach((c, i) => c.position.copy(bed.wakePositions[i]));
      companion.reset(bed.wakePositions[1], terrain.blockers, terrain);
      // Use the clear second landing instead of a random reset offset.
      companion.character.position.copy(bed.wakePositions[1]);
      bed.sleepSymbols.forEach((s) => (s.visible = false));
      if (notify) toast("Rested and ready to wander together.");
      return true;
    },
    update(dt, camera) {
      if (!resting) return;
      elapsed += dt;
      rigs.forEach(
        (rig, i) =>
          (rig.body.position.z = Math.sin(elapsed * 2 + i * 0.3) * 0.012),
      );
      bed.sleepSymbols.forEach((symbol, i) => {
        symbol.position.y = 2.7 + Math.sin(elapsed * 1.3 + i) * 0.12;
        symbol.quaternion.copy(camera.quaternion);
      });
    },
  };
}
