import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createCompanion } from "../src/characters/companion.js";
import { readModels } from "./helpers/models.js";

afterEach(() => vi.restoreAllMocks());
const terrain = { contains: () => true, heightAt: () => 0 };
function forward(character) {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(character.quaternion);
}
function checkStep(companion, target, blockers = []) {
  const before = companion.character.position.clone();
  companion.update(0.04, blockers, target, terrain);
  const movement = companion.character.position.clone().sub(before);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(
    companion.character.quaternion,
  );
  expect(up.y).toBeCloseTo(1, 10);
  if (movement.lengthSq() > 1e-10)
    expect(
      forward(companion.character).dot(movement.normalize()),
    ).toBeGreaterThan(0.99999);
  return before.distanceTo(companion.character.position);
}

test("restored activity quaternions keep the companion upright and facing every walking step", async () => {
  const models = await readModels();
  const companion = createCompanion({ model: models.companion });
  companion.character.position.set(0, 0, 0);
  companion.character.rotation.set(0, 2.7, 0);
  const restored = companion.character.quaternion.clone();
  companion.character.rotation.set(0, 0, 0);
  companion.character.quaternion.copy(restored);
  expect(Math.abs(companion.character.rotation.x)).toBeCloseTo(Math.PI);
  const target = new THREE.Vector3(7, 0, -2);
  let distance = 0;
  for (let i = 0; i < 40; i++) distance += checkStep(companion, target);
  expect(distance).toBeGreaterThan(1);
  companion.character.quaternion.copy(restored);
  companion.reset(target, [], terrain);
  expect(companion.character.rotation.x).toBe(0);
  expect(companion.character.rotation.y).toBe(0);
  expect(companion.character.rotation.z).toBe(0);
});

test("the companion turns before catching up and faces the accepted path around obstacles", async () => {
  const models = await readModels();
  const companion = createCompanion({ model: models.companion });
  companion.character.position.set(0, 0, 0);
  companion.character.rotation.set(0, Math.PI, 0);
  const target = new THREE.Vector3(0, 0, 8);
  expect(checkStep(companion, target)).toBe(0);
  const blockers = [{ x: 0, z: 1.2, r: 0.3 }];
  let distance = 0,
    avoided = false;
  for (let i = 0; i < 120; i++) {
    distance += checkStep(companion, target, blockers);
    avoided ||= Math.abs(companion.character.position.x) > 0.1;
    expect(
      Math.hypot(
        companion.character.position.x,
        companion.character.position.z - 1.2,
      ),
    ).toBeGreaterThanOrEqual(0.95 - 1e-7);
  }
  expect(distance).toBeGreaterThan(1);
  expect(avoided).toBe(true);
});
