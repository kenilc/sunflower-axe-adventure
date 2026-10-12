import { expect, test } from "vitest";
import * as THREE from "three";
import {
  createTreeVisibility,
  FADED_OPACITY,
} from "../src/rendering/tree-visibility.js";

function setup() {
  const house = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(2, 4, 2),
    new THREE.MeshStandardMaterial(),
  );
  wall.position.set(0, 2, 0);
  house.add(wall);
  const visibility = createTreeVisibility();
  visibility.add(house);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 2, 6);
  const heroine = new THREE.Group();
  heroine.position.set(0, 0, -4);
  camera.lookAt(0, 1.6, -4);
  return { visibility, camera, heroine, wall };
}

test("scenery fades along her sightline and becomes opaque when it no longer blocks her", () => {
  const { visibility, camera, heroine, wall } = setup();
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBeLessThan(FADED_OPACITY + 0.01);
  heroine.position.set(4, 0, 3);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBe(1);
  expect(wall.material.depthWrite).toBe(true);
});

test("being near a building does not fade it, but an actual exit surface between the camera and her does", () => {
  const { visibility, camera, heroine, wall } = setup();
  camera.position.set(1.05, 2, 0);
  heroine.position.set(4, 0, 0);
  camera.lookAt(4, 1.6, 0);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBe(1);
  camera.position.set(0, 2, 0);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBeLessThan(FADED_OPACITY + 0.01);
});

test("explicit scenery controllers retain their local visibility when a destination starts hidden", () => {
  const { visibility, camera, heroine, wall } = setup();
  const destination = new THREE.Group();
  destination.visible = false;
  destination.add(wall.parent);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBeLessThan(FADED_OPACITY + 0.01);
  wall.visible = false;
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBe(1);
});

test("activities restore natural materials and shadows immediately, and exploration resumes fading", () => {
  const { visibility, camera, heroine, wall } = setup();
  // Register a second wall with a natural render state that must survive fading.
  const other = wall.clone();
  other.material = new THREE.MeshStandardMaterial({ depthWrite: false });
  other.castShadow = true;
  wall.parent.add(other);
  visibility.add(other);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBeLessThan(FADED_OPACITY + 0.01);
  expect(other.castShadow).toBe(false);
  visibility.update(camera, [heroine], 0, false);
  expect(wall.material.opacity).toBe(1);
  expect(wall.material.transparent).toBe(false);
  expect(wall.material.depthWrite).toBe(true);
  expect(other.material.depthWrite).toBe(false);
  expect(other.castShadow).toBe(true);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBeLessThan(FADED_OPACITY + 0.01);
});

test("thin posts stay solid, but scenery hiding her head or most of her fades", () => {
  const { visibility, camera, heroine, wall } = setup();
  // A post this thin crosses only the middle column of her sightlines.
  wall.scale.set(0.075, 1, 0.075);
  wall.updateMatrixWorld();
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBe(1);
  // A plank across her head alone still hides her face.
  wall.scale.set(1, 0.1, 0.1);
  wall.position.set(0, 2.3, 0);
  wall.updateMatrixWorld();
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBe(FADED_OPACITY);
});

test("fading changes only after a short moment, so passing glimpses neither flicker nor stick", () => {
  const { visibility, camera, heroine, wall } = setup();
  // A brief moment behind the wall does not start a fade.
  visibility.update(camera, [heroine], 0.05);
  heroine.position.set(4, 0, 3);
  visibility.update(camera, [heroine], 0.05);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBe(1);
  heroine.position.set(0, 0, -4);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBe(FADED_OPACITY);
  // Narrowed to cover two of her three columns, it no longer hides enough:
  // after a moment it turns solid again rather than staying faded.
  wall.scale.set(0.2, 1, 0.075);
  wall.position.x = 0.12;
  wall.updateMatrixWorld();
  visibility.update(camera, [heroine], 0.05);
  expect(wall.material.opacity).toBeLessThan(1);
  visibility.update(camera, [heroine], 1);
  expect(wall.material.opacity).toBe(1);
});
