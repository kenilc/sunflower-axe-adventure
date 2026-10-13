import * as THREE from "three";
import { expect, test } from "vitest";
import { createEffects } from "../src/systems/effects.js";
import { createRandom } from "../src/systems/random.js";

function setup(capacity) {
  const scene = new THREE.Scene();
  const effects = createEffects({ scene, rand: createRandom(3), capacity });
  return { scene, effects, cloud: scene.getObjectByName("burst-particles") };
}

test("bursts share one point cloud and fade out before they disappear", () => {
  const { scene, effects, cloud } = setup();
  effects.burst(new THREE.Vector3(1, 2, 3), "#ffe890", 20);
  effects.burst(new THREE.Vector3(), "#dab56c", 10);
  effects.update(0.016);
  expect(scene.children).toEqual([cloud]);
  expect(cloud.geometry.drawRange.count).toBe(30);
  const alpha = cloud.geometry.attributes.color;
  const start = alpha.getW(0);
  effects.update(0.5);
  expect(alpha.getW(0)).toBeLessThan(start);
  effects.update(1);
  expect(effects.particles).toHaveLength(0);
  expect(cloud.geometry.drawRange.count).toBe(0);
});

test("a full pool drops its oldest particles, and clearing empties it", () => {
  const { effects, cloud } = setup(16);
  effects.burst(new THREE.Vector3(), "#ffffff", 70);
  effects.update(0.016);
  expect(effects.particles).toHaveLength(16);
  effects.clearParticles();
  expect(effects.particles).toHaveLength(0);
  expect(cloud.geometry.drawRange.count).toBe(0);
});
