import * as THREE from "three";
import { resolveObstacleCollisions } from "../systems/collision.js";

export function createPhotoMode({ camera, actors, getPlace }) {
  let snapshot = null;
  const target = new THREE.Vector3();
  const settings = {
    yaw: 0,
    pitch: 16,
    distance: 12,
    horizontal: 0,
    vertical: 0,
  };
  function reset() {
    if (!snapshot) return;
    actors.forEach((actor, i) => {
      actor.position.copy(snapshot.actors[i].position);
      actor.rotation.copy(snapshot.actors[i].rotation);
    });
    target.copy(actors[0].position).add(actors[1].position).multiplyScalar(0.5);
    target.y += 1.3;
    const offset = snapshot.camera.position.clone().sub(target);
    settings.yaw = Math.atan2(offset.x, offset.z);
    settings.pitch = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(
        Math.atan2(offset.y, Math.hypot(offset.x, offset.z)),
      ),
      -5,
      80,
    );
    settings.distance = THREE.MathUtils.clamp(offset.length(), 3, 40);
    settings.horizontal = settings.vertical = 0;
    updateCamera();
  }
  function updateCamera() {
    if (!snapshot) return false;
    const pitch = THREE.MathUtils.degToRad(settings.pitch);
    const aim = target
      .clone()
      .add(
        new THREE.Vector3(
          Math.cos(settings.yaw),
          0,
          -Math.sin(settings.yaw),
        ).multiplyScalar(settings.horizontal),
      );
    aim.y += settings.vertical;
    camera.position
      .set(
        Math.sin(settings.yaw) * Math.cos(pitch) * settings.distance,
        Math.sin(pitch) * settings.distance,
        Math.cos(settings.yaw) * Math.cos(pitch) * settings.distance,
      )
      .add(aim);
    camera.lookAt(aim);
    camera.updateMatrixWorld(true);
    return true;
  }
  return {
    settings,
    get active() {
      return Boolean(snapshot);
    },
    enter() {
      if (snapshot) return;
      snapshot = {
        camera: camera.clone(),
        actors: actors.map((actor) => ({
          position: actor.position.clone(),
          rotation: actor.rotation.clone(),
        })),
      };
      reset();
    },
    exit() {
      if (!snapshot) return;
      actors.forEach((actor, i) => {
        actor.position.copy(snapshot.actors[i].position);
        actor.rotation.copy(snapshot.actors[i].rotation);
      });
      camera.position.copy(snapshot.camera.position);
      camera.quaternion.copy(snapshot.camera.quaternion);
      snapshot = null;
    },
    reset,
    updateCamera,
    rotate(dx, dy) {
      settings.yaw -= dx * 0.006;
      settings.pitch = THREE.MathUtils.clamp(
        settings.pitch + dy * 0.15,
        -5,
        80,
      );
      updateCamera();
    },
    zoomBy(delta) {
      settings.distance = THREE.MathUtils.clamp(
        settings.distance + delta * 0.012,
        3,
        40,
      );
      updateCamera();
    },
    adjustActor(index, { x = 0, z = 0, heading = 0 }) {
      if (!snapshot || !actors[index]) return;
      const actor = actors[index],
        origin = snapshot.actors[index].position;
      const previous = actor.position.clone(),
        position = origin.clone();
      // X and Z are offsets from entry, so changing one slider never drifts the other.
      position.x += THREE.MathUtils.clamp(x, -5, 5);
      position.z += THREE.MathUtils.clamp(z, -5, 5);
      const place = getPlace();
      resolveObstacleCollisions(
        position,
        previous,
        place.terrain.blockers ?? [],
      );
      if (place.constrainMovement)
        place.constrainMovement(position, previous, { seated: false });
      else {
        place.terrain.constrain?.(position, previous);
        if (!place.terrain.contains(position.x, position.z))
          position.copy(previous);
        position.y = place.terrain.heightAt(position.x, position.z);
      }
      actor.position.copy(position);
      actor.rotation.y =
        snapshot.actors[index].rotation.y + THREE.MathUtils.degToRad(heading);
    },
  };
}
