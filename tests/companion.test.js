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
      // Following her, he may pass as close as her own trail allows.
    ).toBeGreaterThanOrEqual(0.7 - 1e-7);
  }
  expect(distance).toBeGreaterThan(1);
  expect(avoided).toBe(true);
});

test("through a gap she fits, he follows her trail and keeps up without jumping", async () => {
  const models = await readModels();
  const companion = createCompanion({ model: models.companion });
  // A fence along z = 0 with one gap: wide enough for her, tighter than
  // his usual wandering clearance.
  const fence = [];
  for (let x = 0.95; x < 20; x += 0.5)
    fence.push({ x, z: 0, r: 0.3 }, { x: -x, z: 0, r: 0.3 });
  const hero = new THREE.Vector3(4, 0, 8);
  companion.reset(hero, fence, terrain);
  const route = [
    [0, 3],
    [0, -3],
    [-6, -12],
    [6, -16],
  ];
  let farthest = 0,
    largestStep = 0;
  for (const [x, z] of route) {
    while (Math.hypot(hero.x - x, hero.z - z) > 0.2) {
      const toward = new THREE.Vector3(x - hero.x, 0, z - hero.z);
      const length = toward.length();
      hero.addScaledVector(toward.normalize(), Math.min(7.8 * 0.04, length));
      const before = companion.character.position.clone();
      companion.update(0.04, fence, hero, terrain);
      const { x: cx, z: cz } = companion.character.position;
      largestStep = Math.max(
        largestStep,
        before.distanceTo(companion.character.position),
      );
      farthest = Math.max(farthest, Math.hypot(hero.x - cx, hero.z - cz));
      for (const post of fence)
        expect(Math.hypot(cx - post.x, cz - post.z)).toBeGreaterThan(post.r);
    }
  }
  for (let i = 0; i < 100; i++) companion.update(0.04, fence, hero, terrain);
  expect(companion.character.position.z).toBeLessThan(0);
  expect(largestStep).toBeLessThan(0.5);
  expect(farthest).toBeLessThan(10);
});

test("walking straight at him in a narrow aisle, he steps aside and she gets past", async () => {
  const models = await readModels();
  const companion = createCompanion({ model: models.companion });
  // An aisle 2.6 wide, like a gap between kitchen furniture.
  const aisle = {
    contains: (x) => Math.abs(x) < 1.3,
    heightAt: () => 0,
  };
  const hero = new THREE.Vector3(0, 0, 4);
  companion.reset(hero, [], aisle);
  companion.character.position.set(0, 0, 0.5);
  let stalled = 0;
  for (let i = 0; i < 120; i++) {
    const previous = hero.clone();
    hero.z -= 4.7 * 0.04;
    companion.blocksPlayer(hero, previous);
    if (!aisle.contains(hero.x)) hero.copy(previous);
    if (previous.z - hero.z < 0.02) stalled++;
    companion.update(0.04, [], hero, aisle);
    const { x, z } = companion.character.position;
    expect(aisle.contains(x, z)).toBe(true);
    expect(Math.hypot(hero.x - x, hero.z - z)).toBeGreaterThan(0.85 - 1e-6);
  }
  expect(hero.z).toBeLessThan(-12);
  expect(stalled).toBeLessThan(5);
});
