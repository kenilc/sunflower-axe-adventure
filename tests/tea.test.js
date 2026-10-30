import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";
import {
  PUDDLES,
  TERRACES,
  TRACK,
  heightAt,
  walkable,
} from "../src/locations/tea/world.js";

afterEach(() => vi.unstubAllGlobals());
function frames(game, count = 1) {
  game.rendering.clock.getDelta = () => 0.04;
  for (let i = 0; i < count; i++) game.update();
}
function walk(game, code, count) {
  game.input.keys[code] = true;
  frames(game, count);
  game.input.keys[code] = false;
}
async function flyToTea() {
  const created = await createTestGame();
  const { game } = created;
  expect(game.transitions.restore("mist")).toBe(true);
  const mist = game.places.get("mist");
  game.characters.hero.position.copy(mist.world.balloonSpot);
  frames(game);
  expect(mist.getHud().actions[0].label).toMatch(/tea hills/);
  expect(mist.interact()).toBe(true);
  frames(game, 80);
  expect(game.state.area).toBe("tea");
  return created;
}
const polar = (r, a) => new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);

test("the hollow's balloon flies on to the tea terraces, in the rain, and back", async () => {
  const { game } = await flyToTea();
  const tea = game.places.get("tea"),
    mist = game.places.get("mist"),
    hero = game.characters.hero;
  expect(tea.group.visible).toBe(true);
  expect(mist.group.visible).toBe(false);
  expect(game.readProgress().discoveredPlaces).toContain("tea");
  expect(game.characters.rig.appearance.state.outfit).toBe("tea");
  expect(tea.weather.raining).toBe(true);
  // He holds the umbrella up over them while they walk in the rain.
  frames(game, 10);
  const umbrella =
    game.characters.companion.character.getObjectByName("tea-umbrella");
  expect(umbrella.visible).toBe(true);
  expect(mist.world.trip.flying).toBe(false);

  hero.position.copy(tea.world.balloonSpot);
  frames(game);
  expect(tea.getHud().actions[0].label).toMatch(/hollow/);
  expect(tea.interact()).toBe(true);
  frames(game, 80);
  expect(game.state.area).toBe("mist");
  expect(game.characters.rig.appearance.state.outfit).toBe("mist");
  expect(umbrella.parent).toBe(null);
  expect(tea.weather.rainbow.visible).toBe(false);
});

test("the stone stair climbs the terraces to the tea house; banks and hedges stay unwalked", async () => {
  const { game } = await flyToTea();
  const tea = game.places.get("tea"),
    hero = game.characters.hero;
  // Turn the camera to look north, so W walks straight up the stair.
  game.input.keys.KeyQ = true;
  for (let i = 0; i < 40 && game.state.yaw < 0; i++) frames(game);
  game.input.keys.KeyQ = false;
  expect(Math.abs(game.state.yaw)).toBeLessThan(0.06);
  hero.position.set(0, 0, 23);
  walk(game, "KeyW", 140);
  expect(hero.position.y).toBeCloseTo(TERRACES[0].height);
  expect(hero.position.z).toBeLessThan(5);
  // She walks in under the tea house roof, and the camera stays above it.
  expect(Math.abs(hero.position.x)).toBeLessThan(3);
  expect(game.rendering.camera.position.y).toBeGreaterThan(
    TERRACES[0].height + 4.8,
  );

  // Off the stair, a terrace's walkway ends at its tea hedge, and the
  // bank down to the next terrace is a wall.
  const walkway = polar(8, 1.9).setY(TERRACES[1].height);
  hero.position.copy(walkway);
  walk(game, "KeyD", 40);
  const r = Math.hypot(hero.position.x, hero.position.z);
  expect(r).toBeLessThan(TERRACES[1].hedge);
  expect(r).toBeGreaterThan(TERRACES[1].inner);
  expect(hero.position.y).toBeCloseTo(TERRACES[1].height);
  expect(walkable(...[polar(10.8, 1.9)].map((p) => [p.x, p.z])[0])).toBe(false);
  // The ground is flat round the foot, and the track can be crossed.
  expect(heightAt(0, 26)).toBe(0);
  expect(walkable(0, -TRACK.r)).toBe(true);
});

test("picking tea, jumping in the puddle, a train ride and tea at the top make four memories", async () => {
  const { game } = await flyToTea();
  const tea = game.places.get("tea"),
    hero = game.characters.hero,
    { world } = tea;
  const goTo = (spot) => {
    hero.position.copy(spot).setY(heightAt(spot.x, spot.z));
    frames(game);
  };

  // Picking at the lowest terrace's hedge: baskets on, shoots picked.
  goTo(polar(TERRACES[3].hedge - 0.7, -1.2));
  expect(tea.getHud().actions[0].label).toMatch(/Pick tea/);
  const unpicked = world.shoots.filter((shoot) => !shoot.picked).length;
  expect(tea.interact()).toBe(true);
  expect(game.characters.rig.body.getObjectByName("tea-basket")).toBeTruthy();
  frames(game, 100);
  expect(world.shoots.filter((shoot) => !shoot.picked).length).toBeLessThan(
    unpicked,
  );
  expect(tea.canSaveLocation()).toBe(false);
  expect(tea.interact()).toBe(true);
  expect(game.characters.rig.body.getObjectByName("tea-basket")).toBeFalsy();

  // Hop in the big puddle; it ends by itself.
  goTo(new THREE.Vector3(PUDDLES[0].x, 0, PUDDLES[0].z + 1.4));
  expect(tea.getHud().actions[0].label).toMatch(/puddle/);
  expect(tea.interact()).toBe(true);
  frames(game, 20);
  expect(hero.position.y).toBeGreaterThan(0.1);
  frames(game, 70);
  expect(tea.getProgress().moment).toBe(null);
  expect(hero.position.y).toBe(0);

  // Once round the hill on the toy train, back to the halt.
  goTo(world.trainSpot);
  expect(tea.getHud().actions[0].label).toMatch(/toy train/);
  expect(tea.interact()).toBe(true);
  frames(game, 100);
  expect(world.train.riding).toBe(true);
  expect(world.train.progress).toBeGreaterThan(0.1);
  expect(world.trainSpot.distanceTo(hero.position)).toBeGreaterThan(3);
  frames(game, 700);
  expect(world.train.riding).toBe(false);
  expect(hero.position.distanceTo(world.trainSpot)).toBeLessThan(0.5);

  // Tea at the top: the red panda pours, and the rain stops.
  goTo(world.teaSpot);
  expect(tea.getHud().actions[0].label).toMatch(/tea/);
  expect(tea.interact()).toBe(true);
  expect(tea.cameraLocked()).toBe(true);
  frames(game, 130);
  expect(world.cups.every(({ tea: cup }) => cup.visible)).toBe(true);
  frames(game, 120);
  expect(tea.weather.raining).toBe(false);
  expect(tea.weather.rainbow.visible).toBe(true);
  expect(game.rendering.scene.fog.density).toBeLessThan(0.015);
  expect(tea.interact()).toBe(true);
  expect(tea.getProgress().memories.sort()).toEqual(
    ["picking", "puddles", "tea", "train"].sort(),
  );
  frames(game, 10);
  const umbrella =
    game.characters.companion.character.getObjectByName("tea-umbrella");
  expect(umbrella.visible).toBe(false);
});

test("direct links start a moment, and a restart during one puts everything back", async () => {
  const { game } = await createTestGame();
  game.transitions.open("tea", { activity: "train" });
  const tea = game.places.get("tea");
  expect(game.state.area).toBe("tea");
  frames(game, 30);
  expect(tea.world.train.riding).toBe(true);
  expect(tea.canLeave()).toBe(false);
  game.controls.resetAdventure();
  frames(game, 2);
  expect(tea.world.train.riding).toBe(false);
  expect(tea.getProgress().memories).toEqual([]);
  expect(tea.weather.raining).toBe(true);
});
