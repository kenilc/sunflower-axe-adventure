import * as THREE from "three";
import { expect, test } from "vitest";
import {
  createEnvironment,
  DEFAULT_ENVIRONMENT,
} from "../src/rendering/environment.js";
import { createTestGame } from "./helpers/game.js";

function setup() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.FogExp2(0xffffff, 0);
  const sun = new THREE.DirectionalLight(),
    fill = new THREE.HemisphereLight(),
    renderer = { toneMappingExposure: 1 };
  return {
    scene,
    environment: createEnvironment({ renderer, scene, sun, fill }),
  };
}

test("the sky blends from the fog-matched horizon to skyTop, and rooms turn it off", () => {
  const { scene, environment } = setup();
  const { sky } = environment,
    { horizon, top } = sky.material.uniforms;
  expect(scene.getObjectByName("sky-dome")).toBe(sky);
  expect(sky.visible).toBe(true);
  expect(`#${top.value.getHexString()}`).toBe(DEFAULT_ENVIRONMENT.skyTop);
  environment.apply({ background: "#203040", skyTop: "#102030" });
  expect(`#${horizon.value.getHexString()}`).toBe("#203040");
  expect(horizon.value.equals(scene.fog.color)).toBe(true);
  expect(`#${top.value.getHexString()}`).toBe("#102030");
  environment.apply({ skyTop: null });
  expect(sky.visible).toBe(false);
  // Leaving a room restores the default sky rather than keeping it hidden.
  environment.apply();
  expect(sky.visible).toBe(true);
});

test("caves, the castle room and the sauna hide the sky dome; outdoor places show it", async () => {
  const { game } = await createTestGame();
  const sky = game.rendering.scene.getObjectByName("sky-dome");
  expect(sky.visible).toBe(true);
  for (const [id, visible] of [
    ["cave", false],
    ["village", true],
    ["seaside", false],
    ["winter", true],
  ]) {
    game.transitions.restore(id);
    expect(sky.visible, id).toBe(visible);
  }
  game.transitions.restore("castle");
  expect(sky.visible, "castle").toBe(false);
  game.transitions.restore("summit");
  expect(sky.visible, "summit").toBe(true);
});
