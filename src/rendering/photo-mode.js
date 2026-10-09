import * as THREE from "three";
import { resolveObstacleCollisions } from "../systems/collision.js";

export function createPhotoMode({ camera, actors, getPlace }) {
  let snapshot = null,
    selectedActor = null,
    manipulation = "turn";
  const raycaster = new THREE.Raycaster();
  function pointerRay(x, y, bounds) {
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((x - bounds.left) / bounds.width) * 2 - 1,
        1 - ((y - bounds.top) / bounds.height) * 2,
      ),
      camera,
    );
    return raycaster;
  }
  function placeActor(index, position) {
    const actor = actors[index],
      previous = actor.position.clone();
    const origin = snapshot.actors[index].position;
    position.x = THREE.MathUtils.clamp(position.x, origin.x - 5, origin.x + 5);
    position.z = THREE.MathUtils.clamp(position.z, origin.z - 5, origin.z + 5);
    const place = getPlace();
    resolveObstacleCollisions(position, previous, place.terrain.blockers ?? []);
    if (place.constrainMovement)
      place.constrainMovement(position, previous, { seated: false });
    else {
      place.terrain.constrain?.(position, previous);
      if (!place.terrain.contains(position.x, position.z))
        position.copy(previous);
      position.y = place.terrain.heightAt(position.x, position.z);
    }
    actor.position.copy(position);
  }
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
    selectedActor = null;
    manipulation = "turn";
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
    settings.distance = THREE.MathUtils.clamp(
      Math.min(offset.length(), 12),
      3,
      40,
    );
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
    get selectedActor() {
      return selectedActor;
    },
    get manipulation() {
      return manipulation;
    },
    selectActor(index) {
      const next = actors[index] ? index : null;
      if (next !== selectedActor) manipulation = "turn";
      selectedActor = next;
    },
    setManipulation(value) {
      manipulation = value === "move" ? "move" : "turn";
    },
    selectAt(x, y, bounds) {
      const previousSelection = selectedActor;
      actors.forEach((actor) => actor.updateWorldMatrix(true, true));
      const hits = pointerRay(x, y, bounds)
        .intersectObjects(actors, true)
        .filter((hit) => {
          for (let object = hit.object; object; object = object.parent)
            if (!object.visible) return false;
          return true;
        });
      selectedActor = hits.length
        ? actors.findIndex((actor) => {
            for (let object = hits[0].object; object; object = object.parent)
              if (object === actor) return true;
            return false;
          })
        : null;
      if (selectedActor !== previousSelection) manipulation = "turn";
      return selectedActor;
    },
    groundPoint(x, y, bounds) {
      if (selectedActor === null) return null;
      const plane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -actors[selectedActor].position.y,
      );
      return pointerRay(x, y, bounds).ray.intersectPlane(
        plane,
        new THREE.Vector3(),
      );
    },
    get selectedPosition() {
      return selectedActor === null
        ? null
        : actors[selectedActor].position.clone();
    },
    moveSelected(position) {
      if (snapshot && selectedActor !== null)
        placeActor(selectedActor, position.clone());
    },
    turnSelected(dx) {
      if (snapshot && selectedActor !== null)
        actors[selectedActor].rotation.y += dx * 0.012;
    },
    pan(dx, dy, height) {
      const unit =
        (2 *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          settings.distance) /
        height;
      settings.horizontal = THREE.MathUtils.clamp(
        settings.horizontal - dx * unit,
        -8,
        8,
      );
      settings.vertical = THREE.MathUtils.clamp(
        settings.vertical + dy * unit,
        -4,
        6,
      );
      updateCamera();
    },
    zoomByScale(scale) {
      settings.distance = THREE.MathUtils.clamp(
        settings.distance * scale,
        3,
        40,
      );
      updateCamera();
    },
    selectionBounds() {
      if (selectedActor === null) return null;
      const actor = actors[selectedActor];
      actor.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(actor);
      const min = new THREE.Vector2(Infinity, Infinity),
        max = new THREE.Vector2(-Infinity, -Infinity);
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const point = new THREE.Vector3(x, y, z).project(camera);
            if (point.z < -1 || point.z > 1) return null;
            min.min(new THREE.Vector2((point.x + 1) / 2, (1 - point.y) / 2));
            max.max(new THREE.Vector2((point.x + 1) / 2, (1 - point.y) / 2));
          }
      return {
        left: min.x,
        top: min.y,
        width: max.x - min.x,
        height: max.y - min.y,
      };
    },
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
      selectedActor = null;
      manipulation = "turn";
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
      const position = origin.clone();
      position.x += x;
      position.z += z;
      placeActor(index, position);
      actor.rotation.y =
        snapshot.actors[index].rotation.y + THREE.MathUtils.degToRad(heading);
    },
  };
}
