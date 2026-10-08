import { test, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";
import { createPlaceRegistry } from "../src/game/place-registry.js";

afterEach(() => vi.unstubAllGlobals());

test("a registered place supports entry, movement, actions, a room, return, and restart", async () => {
  const { game, element, handlers } = await createTestGame();
  game.rendering.clock.getDelta = () => 0.04;
  const group = new THREE.Group();
  game.rendering.scene.add(group);
  const memory = { visits: 0, souvenirs: 0, elapsed: 0, exits: 0 };
  const terrain = {
    contains: (x, z) => Math.hypot(x, z) < 12,
    heightAt: () => 2,
    blockers: [{ x: 3, z: 0, r: 1 }],
  };
  const gardenView = {
    yaw: game.state.yaw,
    pitch: game.state.pitch,
    zoom: game.state.zoom,
    fov: game.rendering.camera.fov,
  };
  game.places.register({
    id: "test-grove",
    name: "Lantern Grove",
    parent: "garden",
    group,
    terrain,
    canThrow: false,
    entrance: {
      from: "garden",
      contains: (position) =>
        position.distanceTo(new THREE.Vector3(0, 0, 7)) < 0.2,
    },
    returnSpawn: [0, 0, 10],
    settings: {
      spawn: [0, 2, 0],
      camera: { yaw: 0, pitch: 0.4, zoom: 18, fov: 55 },
      environment: { background: "#88aa99", fogDensity: 0.01 },
    },
    enter() {
      memory.visits++;
    },
    exit() {
      memory.exits++;
    },
    update(dt) {
      memory.elapsed += dt;
    },
    reset() {
      memory.souvenirs = 0;
    },
    getHud: () => ({
      region: "Lantern Grove",
      hint: "Collect a keepsake · X",
      quest: {
        eyebrow: "LANTERN GROVE",
        title: "A quiet grove.",
        objective: "Find a keepsake.",
      },
      progress: `${memory.souvenirs} keepsakes`,
      actions: [
        {
          key: "KeyX",
          label: "Collect keepsake · X",
          run: () => memory.souvenirs++,
        },
      ],
    }),
  });
  assert(!group.visible, "Registered places start hidden");
  assert.throws(() => game.controls.travelTo("missing-place"), /Unknown place/);
  assert.equal(game.state.area, "garden");
  assert(!game.passageTransition.active);
  game.places.register({
    id: "locked-place",
    parent: "garden",
    terrain,
    canEnter: () => false,
  });
  assert.equal(game.controls.travelTo("locked-place"), false);
  assert(!game.passageTransition.active);

  game.update();
  assert(
    game.passageTransition.active,
    "Registry entrance is detected without a coordinator gate branch",
  );
  for (let i = 0; i < 15; i++) game.update();
  assert.equal(game.state.area, "test-grove");
  assert(group.visible && !game.worlds.garden.visible);
  assert.equal(game.characters.hero.position.y, 2);
  assert.equal(game.characters.companion.character.position.y, 2);
  assert.equal(element("#region").firstChild.textContent, "Lantern Grove");
  assert.equal(element("#placeAction").textContent, "Collect keepsake · X");
  assert.equal(element("#placeAction").hidden, false);
  assert.equal(element("#benchAction").hidden, true);
  assert.equal(game.readProgress().location, "Lantern Grove");
  handlers.get("keydown")({ code: "KeyX", repeat: false, preventDefault() {} });
  assert.equal(memory.souvenirs, 1);
  element("#placeAction").onclick();
  assert.equal(memory.souvenirs, 2);
  const time = memory.elapsed;
  element("#guide").open = true;
  game.update();
  element("#placeAction").onclick();
  assert.equal(memory.elapsed, time);
  assert.equal(memory.souvenirs, 2);
  element("#guide").open = false;
  game.input.keys.KeyD = true;
  for (let i = 0; i < 20; i++) game.update();
  game.input.keys.KeyD = false;
  assert(
    terrain.contains(
      game.characters.hero.position.x,
      game.characters.hero.position.z,
    ),
  );
  assert(
    Math.hypot(
      game.characters.hero.position.x - 3,
      game.characters.hero.position.z,
    ) >=
      1.38 - 1e-7,
  );
  const outside = game.characters.hero.position.clone();
  const room = new THREE.Group();
  game.rendering.scene.add(room);
  game.places.register({
    id: "test-hut",
    kind: "room",
    parent: "test-grove",
    group: room,
    terrain: {
      contains: (x, z) => Math.hypot(x, z) < 5,
      heightAt: () => 4,
      blockers: [],
    },
    canThrow: false,
    settings: {
      spawn: [0, 4, 0],
      camera: { yaw: 1, pitch: 0.7, zoom: 10, fov: 48 },
    },
    getHud: () => ({ region: "Grove hut" }),
  });
  assert(game.controls.travelTo("test-hut"));
  for (let i = 0; i < 15; i++) game.update();
  assert.equal(game.state.area, "test-grove");
  assert.equal(game.state.room, "test-hut");
  assert.equal(game.characters.hero.position.y, 4);
  assert(game.controls.travelTo("test-grove"));
  for (let i = 0; i < 15; i++) game.update();
  assert.equal(game.state.room, null);
  assert(game.characters.hero.position.distanceTo(outside) < 1e-7);
  assert.equal(game.rendering.camera.fov, 55);
  assert(game.controls.travelTo("garden"));
  for (let i = 0; i < 15; i++) game.update();
  assert.equal(game.state.area, "garden");
  assert(!group.visible);
  assert(
    game.characters.hero.position.distanceTo(new THREE.Vector3(0, 0, 10)) <
      1e-7,
  );
  assert.equal(game.state.yaw, gardenView.yaw);
  assert.equal(game.state.pitch, gardenView.pitch);
  assert.equal(game.state.zoom, gardenView.zoom);
  assert.equal(game.rendering.camera.fov, gardenView.fov);
  assert.equal(element(".quest .eyebrow").textContent, "THE SUNKEN GARDEN");
  assert.equal(memory.souvenirs, 2, "Progress survives departure");
  assert(game.controls.travelTo("test-grove"));
  for (let i = 0; i < 15; i++) game.update();
  element("#restart").onclick();
  game.update();
  assert.equal(game.state.area, "garden");
  assert.equal(memory.souvenirs, 0);
  assert(!game.passageTransition.active);
});

test("invalid place graphs and unknown transitions fail before changing location", () => {
  const places = createPlaceRegistry();
  const terrain = { contains: () => true, heightAt: () => 0 };
  places.register({ id: "garden", terrain });
  assert.throws(() => places.register({ id: "garden", terrain }), /Duplicate/);
  places.register({ id: "a", parent: "b", terrain });
  assert.throws(() => places.validate(), /Missing parent/);
  places.register({ id: "b", parent: "a", terrain });
  assert.throws(() => places.validate(), /cycle/);
});
