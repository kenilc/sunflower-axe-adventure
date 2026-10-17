import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";

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
async function flyToMist() {
  const created = await createTestGame();
  const { game } = created;
  game.transitions.jump("lavender");
  frames(game);
  expect(game.state.area).toBe("lavender");
  const lavender = game.places.get("lavender");
  const spot = lavender.world.balloonSpot;
  game.characters.hero.position.copy(spot);
  frames(game);
  expect(lavender.getHud().actions[0].label).toMatch(/misty forest/);
  const ground = lavender.world.balloonTrip.balloon.position.y;
  expect(lavender.interact()).toBe(true);
  expect(lavender.world.balloonTrip.flying).toBe(true);
  frames(game, 20);
  // They rise, standing in the basket.
  expect(lavender.world.balloonTrip.balloon.position.y).toBeGreaterThan(
    ground + 0.2,
  );
  frames(game, 60);
  expect(game.state.area).toBe("mist");
  return created;
}

test("the balloon flies from Lavender Hills to Mistwood Hollow and back", async () => {
  const { game } = await flyToMist();
  const mist = game.places.get("mist"),
    lavender = game.places.get("lavender"),
    hero = game.characters.hero;
  expect(mist.group.visible).toBe(true);
  expect(lavender.group.visible).toBe(false);
  expect(game.readProgress().discoveredPlaces).toContain("mist");
  expect(game.characters.rig.appearance.state.outfit).toBe("mist");
  // Lavender's balloon is back on its hilltop.
  expect(lavender.world.balloonTrip.flying).toBe(false);
  expect(lavender.world.balloonTrip.balloon.position.y).toBeCloseTo(4, 3);

  hero.position.copy(mist.world.balloonSpot);
  frames(game);
  expect(mist.getHud().actions[0].label).toMatch(/Lavender Hills/);
  expect(mist.interact()).toBe(true);
  frames(game, 80);
  expect(game.state.area).toBe("lavender");
  expect(game.characters.rig.appearance.state.outfit).toBe("lavender");
  expect(hero.position.distanceTo(lavender.world.balloonSpot)).toBeLessThan(
    2.4,
  );
  expect(mist.world.trip.flying).toBe(false);
});

test("the lantern path leads from the meadow to the clearing, and the forest stays unwalked", async () => {
  const { game } = await flyToMist();
  const mist = game.places.get("mist"),
    hero = game.characters.hero,
    { terrain } = mist;
  // Follow the path north, keeping to its curve.
  for (let i = 0; i < 400 && hero.position.z > -2; i++) {
    const ahead = hero.position.z - 1;
    const steer = 3.2 * Math.sin(ahead * 0.22) - hero.position.x;
    game.input.keys.KeyW = true;
    game.input.keys.KeyA = steer < -0.3;
    game.input.keys.KeyD = steer > 0.3;
    frames(game);
  }
  Object.assign(game.input.keys, { KeyW: false, KeyA: false, KeyD: false });
  expect(hero.position.z).toBeLessThan(-1.5);
  expect(terrain.contains(0, -5)).toBe(true);
  // Deep among the trees, and off the board, are out of bounds.
  expect(terrain.contains(-14, 8)).toBe(false);
  expect(terrain.contains(0, 29.5)).toBe(false);
  // Nobody walks into the pond.
  hero.position.set(0, 0, -6);
  walk(game, "KeyW", 40);
  expect(
    Math.hypot(
      hero.position.x - mist.world.pond.x,
      hero.position.z - mist.world.pond.z,
    ),
  ).toBeGreaterThan(mist.world.pond.r);
});

test("greeting the mist puffs, knocking on every house, a lantern and a rest make four memories", async () => {
  const { game } = await flyToMist();
  const mist = game.places.get("mist"),
    hero = game.characters.hero,
    { world } = mist;
  const goTo = (spot) => {
    hero.position.set(spot.x, 0, spot.z);
    frames(game);
  };
  goTo(new THREE.Vector3(world.glade.x, 0, world.glade.z));
  expect(mist.getHud().actions[0].label).toMatch(/mist puffs/);
  const home = world.wisps[0].puff.position.clone();
  expect(mist.interact()).toBe(true);
  frames(game, 30);
  expect(world.wisps[0].puff.position.distanceTo(home)).toBeGreaterThan(0.3);

  for (const [i, house] of world.houses.entries()) {
    goTo(house.door);
    expect(mist.getHud().actions[0].label).toMatch(house.kind);
    expect(mist.interact()).toBe(true);
    if (i === 0) {
      frames(game, 3);
      expect(house.home.scale.y).not.toBe(house.home.scale.x);
      expect(mist.getProgress().memories).not.toContain("houses");
    }
  }
  expect(mist.getProgress().housesGreeted).toBe(4);

  goTo(new THREE.Vector3(world.pond.x + 4, 0, world.pond.z + 1));
  expect(mist.getHud().actions[0].label).toMatch(/lantern/);
  expect(mist.interact()).toBe(true);
  expect(world.floating[0].boat.visible).toBe(true);

  goTo(world.restSpot);
  expect(mist.getHud().actions[0].label).toMatch(/log/);
  expect(mist.interact()).toBe(true);
  expect(mist.canLeave()).toBe(false);
  frames(game, 90);
  expect(mist.interact()).toBe(true);
  expect(mist.getProgress().resting).toBe(false);

  expect(mist.getProgress().memories).toEqual([
    "wisps",
    "houses",
    "pond",
    "rest",
  ]);
  expect(mist.getHud().progress).toBe("4 / 4 misty memories");
  mist.reset();
  expect(mist.getProgress().memories).toEqual([]);
  expect(mist.getProgress().housesGreeted).toBe(0);
  expect(world.floating[0].boat.visible).toBe(false);
});
