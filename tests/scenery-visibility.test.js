import { expect, test } from "vitest";
import * as THREE from "three";
import { createTreeVisibility } from "../src/rendering/tree-visibility.js";

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
  expect(wall.material.opacity).toBeLessThan(0.09);
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
  expect(wall.material.opacity).toBeLessThan(0.09);
});
