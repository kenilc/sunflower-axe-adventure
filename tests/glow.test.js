import * as THREE from "three";
import { expect, test } from "vitest";
import { createGlow, GLOW_LAYER, markGlow } from "../src/rendering/glow.js";
import { createTestGame } from "./helpers/game.js";

test("marked light sources join the glow layer and keep rendering normally", () => {
  const lantern = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.SphereGeometry(), undefined);
  lantern.add(paper);
  markGlow(lantern);
  expect(paper.layers.isEnabled(GLOW_LAYER)).toBe(true);
  expect(paper.layers.isEnabled(0)).toBe(true);
});

test("the glow stays off without a real WebGL renderer", () => {
  const glow = createGlow({ renderer: { render() {} } });
  expect(glow.enabled).toBe(false);
  expect(() =>
    glow.render(new THREE.Scene(), new THREE.Camera()),
  ).not.toThrow();
});

test("festival lanterns, winter windows and the garden relic glow", async () => {
  const { game } = await createTestGame();
  const glowing = (place) => {
    let count = 0;
    game.places.get(place).group.traverse((node) => {
      if (node.layers.isEnabled(GLOW_LAYER)) count++;
    });
    return count;
  };
  expect(glowing("festival")).toBeGreaterThan(50);
  expect(glowing("winter")).toBeGreaterThan(10);
  expect(glowing("garden")).toBeGreaterThan(0);
});
