import * as THREE from "three";
import { expect, test } from "vitest";
import { createHearts } from "../src/systems/hearts.js";

test("a bump sends hearts up in a widening cone that vanish at different heights", () => {
  const scene = new THREE.Scene();
  const hearts = createHearts(scene);
  const woman = new THREE.Vector3(0, 0, 0),
    man = new THREE.Vector3(1, 0, 0);
  hearts.contact(true, woman, man);
  expect(hearts.hearts).toHaveLength(20);
  // Holding the bump does not spawn more.
  hearts.contact(true, woman, man);
  expect(hearts.hearts).toHaveLength(20);
  const start = hearts.hearts.map((h) => h.position.clone());
  hearts.update(0.5);
  hearts.hearts.forEach((heart, i) => {
    const rose = heart.position.y - start[i].y;
    const spread = Math.hypot(
      heart.position.x - start[i].x,
      heart.position.z - start[i].z,
    );
    expect(rose).toBeGreaterThan(0);
    expect(spread).toBeLessThan(rose);
  });
  const lives = new Set(hearts.hearts.map((h) => h.life.toFixed(2)));
  expect(lives.size).toBeGreaterThan(5);
  hearts.update(3);
  expect(hearts.hearts).toHaveLength(0);
  expect(scene.getObjectByName("contact-hearts").count).toBe(0);
});
