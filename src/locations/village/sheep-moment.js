import * as THREE from "three";

export function createSheepMoment({
  village,
  hero,
  heroRig,
  companion,
  camera,
  capturePhoto,
  mesh,
  box,
  cyl,
  $,
  toast,
  beep,
  hearts,
  clearInput,
  reactions,
  onMemory,
}) {
  const cameraProp = new THREE.Group();
  cameraProp.name = "sheep-photo-camera";
  cameraProp.visible = false;
  companion.rig.body.add(cameraProp);
  cameraProp.position.set(0, 2.05, 0.78);
  box(0.65, 0.4, 0.25, "#465653", 0, 0, 0, cameraProp);
  box(0.18, 0.12, 0.2, "#d9d6bc", -0.19, 0.24, 0, cameraProp);
  const lens = cyl(0.15, 0.18, 0.2, "#9aaeb0", 0.05, 0, 0.2, cameraProp, 16);
  lens.rotation.x = Math.PI / 2;
  const glass = cyl(
    0.11,
    0.11,
    0.025,
    "#385b6b",
    0.05,
    0,
    0.315,
    cameraProp,
    16,
  );
  glass.rotation.x = Math.PI / 2;
  glass.name = "sheep-camera-lens";
  const photoCamera = new THREE.PerspectiveCamera(55, 4 / 3, 0.05, 320);
  photoCamera.name = "sheep-photographer-view";
  const flash = mesh(
    new THREE.SphereGeometry(0.11, 8, 6),
    new THREE.MeshBasicMaterial({ color: "#fff6da" }),
    -0.21,
    0.13,
    0.14,
    cameraProp,
  );
  flash.visible = false;
  flash.castShadow = flash.receiveShadow = false;
  const photo = $("#sheepPhoto"),
    image = $("#sheepPhotoImage");
  photo.hidden = true;
  function closePhoto() {
    photo.close?.();
    photo.hidden = true;
    clearInput();
  }
  function openPhoto() {
    image.src = lastPhoto;
    clearInput();
    photo.hidden = false;
    if (!photo.open) photo.showModal?.();
  }
  $("#closeSheepPhoto").onclick = closePhoto;
  photo.addEventListener("close", closePhoto);
  photo.addEventListener("click", (event) => {
    if (event.target === photo) closePhoto();
  });
  let active = false,
    elapsed = 0,
    sheep = null,
    captured = false,
    pendingCapture = false,
    snapshots = [],
    womanTarget,
    manTarget,
    sheepOrigin,
    sheepHeading,
    lastPhoto = null;
  const duration = 7;
  const memories = new Set();
  const actors = [
    { character: hero, rig: heroRig },
    { character: companion.character, rig: companion.rig },
  ];
  function visibleBounds(object) {
    object.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3();
    object.traverseVisible((node) => {
      if (!node.isMesh) return;
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
      bounds.union(
        node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld),
      );
    });
    return bounds;
  }
  function clear(position) {
    return (
      village.contains(position.x, position.z) &&
      village.blockers.every(
        (b) =>
          b.active === false ||
          Math.hypot(position.x - b.x, position.z - b.z) > b.r + 0.65,
      )
    );
  }
  function clearPath(from, to) {
    for (let i = 1; i <= 12; i++)
      if (!clear(from.clone().lerp(to, i / 12))) return false;
    return true;
  }
  function target(from, animal, distance, other, separation = 1.4) {
    const angle = Math.atan2(from.x - animal.x, from.z - animal.z);
    for (const offset of [0, 0.3, -0.3, 0.6, -0.6, 1, -1, Math.PI]) {
      const point = animal
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(angle + offset) * distance,
            0,
            Math.cos(angle + offset) * distance,
          ),
        );
      if (
        clear(point) &&
        (!other || point.distanceTo(other) > separation) &&
        clearPath(from, point)
      )
        return point;
    }
    return null;
  }
  function restore() {
    if (!active) return;
    active = pendingCapture = false;
    for (const [i, { character, rig }] of actors.entries()) {
      const saved = snapshots[i];
      rig.body.position.copy(saved.bodyPosition);
      rig.body.rotation.copy(saved.bodyRotation);
      rig.head.rotation.copy(saved.headRotation);
      [...rig.legs, ...rig.arms].forEach((limb, j) =>
        limb.rotation.copy(saved.limbs[j]),
      );
      character.rotation.copy(saved.rotation);
      rig.items.setHidden("sheep-photo", false);
      saved.release();
    }
    sheep.group.position.copy(sheepOrigin);
    sheep.group.rotation.set(0, sheepHeading, 0);
    sheep.head.rotation.x = 0.25;
    sheep.legs.forEach((leg) => (leg.rotation.x = 0));
    sheep.obstacle.x = sheepOrigin.x;
    sheep.obstacle.z = sheepOrigin.z;
    sheep.interacting = false;
    sheep.petTime = captured ? 3 : 0;
    cameraProp.visible = flash.visible = false;
    snapshots = [];
    clearInput();
  }
  return {
    cameraProp,
    photoCamera,
    memories,
    duration,
    get active() {
      return active;
    },
    get elapsed() {
      return elapsed;
    },
    get hasPhoto() {
      return Boolean(lastPhoto);
    },
    get viewing() {
      return !photo.hidden;
    },
    start(animal) {
      if (active) return false;
      womanTarget = target(hero.position, animal.group.position, 1.5);
      if (!womanTarget) return false;
      const man = companion.character.position;
      manTarget =
        man.distanceTo(animal.group.position) > 2.3 &&
        man.distanceTo(womanTarget) > 3.2 &&
        clear(man)
          ? man.clone()
          : target(man, animal.group.position, 4.3, womanTarget, 3.2);
      if (!manTarget) return false;
      reactions.cancel();
      clearInput();
      sheep = animal;
      sheepOrigin = sheep.group.position.clone();
      sheepHeading = sheep.group.rotation.y;
      snapshots = actors.map(({ character, rig }) => ({
        position: character.position.clone(),
        rotation: character.rotation.clone(),
        bodyPosition: rig.body.position.clone(),
        bodyRotation: rig.body.rotation.clone(),
        headRotation: rig.head.rotation.clone(),
        limbs: [...rig.legs, ...rig.arms].map((limb) => limb.rotation.clone()),
        release: rig.appearance.override({ expression: "happy" }),
      }));
      actors.forEach(({ rig }) => rig.items.setHidden("sheep-photo", true));
      sheep.interacting = active = true;
      sheep.petTime = duration;
      elapsed = 0;
      captured = pendingCapture = false;
      closePhoto();
      toast("She kneels for a woolly hello. He gets the camera ready… ♥");
      return true;
    },
    update(dt) {
      if (!active) return;
      elapsed += dt;
      const approach = THREE.MathUtils.smoothstep(elapsed, 0, 1.5);
      hero.position.copy(snapshots[0].position).lerp(womanTarget, approach);
      companion.character.position
        .copy(snapshots[1].position)
        .lerp(manTarget, approach);
      const play = THREE.MathUtils.smoothstep(elapsed, 1.2, 2);
      hero.rotation.y = Math.atan2(
        sheepOrigin.x - hero.position.x,
        sheepOrigin.z - hero.position.z,
      );
      heroRig.body.position.y = -0.36 * play;
      heroRig.body.rotation.x = 0.22 * play;
      heroRig.legs[0].rotation.x = -0.55 * play;
      heroRig.legs[1].rotation.x = 0.32 * play;
      heroRig.arms[0].rotation.x =
        (-0.95 + Math.sin(elapsed * 4) * 0.16) * play;
      heroRig.arms[1].rotation.x = -0.55 * play;
      const subject = hero.position.clone().lerp(sheepOrigin, 0.3);
      companion.character.rotation.y = Math.atan2(
        subject.x - manTarget.x,
        subject.z - manTarget.z,
      );
      companion.rig.arms.forEach((arm, i) => {
        arm.rotation.x = -2.05 * play;
        arm.rotation.z = (i ? -0.25 : 0.25) * play;
      });
      cameraProp.visible = elapsed > 1.5;
      const nuzzle = Math.sin(Math.max(0, elapsed - 2) * 3) * 0.05 * play;
      sheep.group.position.copy(sheepOrigin).y += Math.max(0, nuzzle);
      sheep.group.rotation.y = Math.atan2(
        hero.position.x - sheepOrigin.x,
        hero.position.z - sheepOrigin.z,
      );
      sheep.head.rotation.x = -0.22 + Math.sin(elapsed * 3.5) * 0.12;
      sheep.legs.forEach(
        (leg, i) => (leg.rotation.x = Math.sin(elapsed * 3 + i) * 0.08 * play),
      );
      const subjectCenter = visibleBounds(hero)
        .union(visibleBounds(sheep.group))
        .getCenter(new THREE.Vector3());
      companion.character.updateWorldMatrix(true, true);
      cameraProp.lookAt(subjectCenter);
      if (elapsed >= 3.8 && !captured) {
        captured = pendingCapture = true;
        memories.add(village.sheep.indexOf(sheep));
        village.stamps.add("sheep");
        onMemory();
        beep(1300, 0.07);
        hearts.contact(true, hero.position, companion.character.position);
        toast("Click! A woolly afternoon, captured together ♥");
      }
      flash.visible = captured && elapsed < 4;
      if (elapsed >= duration) restore();
    },
    updateCamera(dt) {
      if (!active) return false;
      const center = hero.position
        .clone()
        .add(sheepOrigin)
        .add(companion.character.position)
        .multiplyScalar(1 / 3);
      const direction = manTarget.clone().sub(sheepOrigin).setY(0).normalize();
      const side = new THREE.Vector3(direction.z, 0, -direction.x);
      const distance = camera.aspect < 1 ? 11 : 9;
      const desired = center
        .clone()
        .addScaledVector(direction, -distance * 0.25)
        .addScaledVector(side, distance * 0.8)
        .add(new THREE.Vector3(0, distance * 0.48, 0));
      camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
      camera.lookAt(center.x, center.y + 1.2, center.z);
      return true;
    },
    afterRender(paused) {
      if (!pendingCapture || paused) return;
      pendingCapture = false;
      // The optical viewpoint is at his lens, facing along the prop's +Z axis.
      glass.getWorldPosition(photoCamera.position);
      cameraProp.getWorldQuaternion(photoCamera.quaternion);
      photoCamera.rotateY(Math.PI);
      photoCamera.updateMatrixWorld(true);
      let halfFrame = 0;
      for (const subject of [hero, sheep.group]) {
        const bounds = visibleBounds(subject);
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z]) {
              const point = new THREE.Vector3(x, y, z).applyMatrix4(
                photoCamera.matrixWorldInverse,
              );
              const depth = Math.max(0.05, -point.z);
              halfFrame = Math.max(
                halfFrame,
                Math.abs(point.y) / depth,
                Math.abs(point.x) / depth / photoCamera.aspect,
              );
            }
      }
      photoCamera.fov = THREE.MathUtils.clamp(
        THREE.MathUtils.radToDeg(2 * Math.atan(halfFrame * 1.12)),
        38,
        110,
      );
      photoCamera.updateProjectionMatrix();
      photoCamera.updateMatrixWorld(true);
      const capturedPhoto = capturePhoto(photoCamera, [companion.character]);
      if (!capturedPhoto) return;
      lastPhoto = capturedPhoto;
      openPhoto();
    },
    showPhoto() {
      if (lastPhoto) {
        openPhoto();
      }
    },
    cancel() {
      restore();
      closePhoto();
    },
    reset() {
      restore();
      memories.clear();
      lastPhoto = null;
      image.removeAttribute?.("src");
      closePhoto();
    },
  };
}
