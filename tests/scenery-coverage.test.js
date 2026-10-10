import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";
import { createSceneryVisibility } from "../src/rendering/scenery-visibility.js";

afterEach(() => vi.unstubAllGlobals());

test("shared scenery coverage handles nested moving objects and never fades either actor", () => {
  const world = new THREE.Group(),
    object = new THREE.Group();
  const nested = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 4, 2),
    Array(6).fill(material),
  );
  mesh.position.y = 2;
  nested.add(mesh);
  object.add(nested);
  world.add(object);
  const heroine = new THREE.Group(),
    companion = new THREE.Group();
  const actorMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), material);
  companion.add(actorMesh);
  world.add(companion);
  const visibility = createSceneryVisibility({
    group: world,
    actors: [heroine, companion],
  });
  expect(visibility.count).toBe(1);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 2, 6);
  heroine.position.set(0, 0, -4);
  camera.lookAt(0, 1.6, -4);
  visibility.update(camera, heroine, 1);
  expect(mesh.material.every((value) => value.opacity < 0.09)).toBe(true);
  expect(actorMesh.material.opacity).toBe(1);
  expect(material.opacity).toBe(1);
  object.position.x = 6;
  visibility.update(camera, heroine, 1);
  expect(mesh.material.every((value) => value.opacity === 1)).toBe(true);
  expect(mesh.castShadow).toBe(false);
});

test("cave, castle, shops, village, festival and funfair all protect only her sightline in photo mode", async () => {
  const { game } = await createTestGame();
  const { hero, companion } = game.characters;
  game.rendering.clock.getDelta = () => 0.04;
  const frames = () => {
    for (let i = 0; i < 35; i++) game.update();
  };
  const cases = [
    ["cave", "cave-chamber-wall-0"],
    ["castle", "castle-room-wall--12-0"],
    ["village", "bakery-chalet"],
    ["shop:bakery", null],
    ["shop:outfit", null],
    ["shop:flowers", null],
    ["festival", "festival-street-house"],
    ["funfair", "ring-toss-booth"],
  ];
  for (const [id, name] of cases) {
    expect(game.transitions.restore(id), id).toBe(true);
    const place = game.places.get(id);
    const object = name
      ? place.group.getObjectByName(name)
      : place.group.children.find(
          (node) => node.isMesh && node.geometry.parameters.height === 4.5,
        );
    expect(object, id).toBeTruthy();
    object.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const normal =
      size.x < size.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const tangent = new THREE.Vector3(normal.z, 0, -normal.x);
    const halfDepth = (normal.x ? size.x : size.z) / 2;
    const halfWidth = (normal.x ? size.z : size.x) / 2;
    const floor = bounds.min.y;
    const behind = center
      .clone()
      .addScaledVector(normal, -halfDepth - 3)
      .setY(floor);
    const clear = center
      .clone()
      .addScaledVector(normal, halfDepth + 2)
      .addScaledVector(tangent, halfWidth + 4)
      .setY(floor);
    hero.position.copy(clear);
    companion.character.position.copy(behind);
    const oldPreset = place.getPhotoPreset;
    place.getPhotoPreset = () => ({
      lockActors: true,
      target: center.clone().setY(floor + 1.6),
      yaw: normal.x ? Math.PI / 2 : 0,
      pitch: 0,
      distance: halfDepth + 8,
    });
    expect(game.activities.photography.enter(), id).toBe(true);
    frames();
    const meshes = [];
    object.traverse((node) => {
      if (node.isMesh) meshes.push(node);
    });
    expect(object.visible, `${id} keeps the whole wall present`).toBe(true);
    expect(
      meshes.every((mesh) =>
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every(
          (material) => material.opacity === 1,
        ),
      ),
      `${id}: only he is behind it`,
    ).toBe(true);
    hero.position.copy(behind);
    frames();
    expect(
      meshes.some((mesh) =>
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).some(
          (material) => material.opacity < 0.2,
        ),
      ),
      `${id}: she is behind it`,
    ).toBe(true);
    hero.position.copy(clear);
    frames();
    expect(
      meshes.every((mesh) =>
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every(
          (material) => material.opacity === 1,
        ),
      ),
      `${id}: she clears it again`,
    ).toBe(true);
    game.activities.photography.exit();
    place.getPhotoPreset = oldPreset;
  }
});
