import { afterEach, expect, test, vi } from "vitest";
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

test("the northwest polder gate is walkable, unlocks the map and returns to the garden", async () => {
  const { game, element } = await createTestGame();
  const place = game.places.get("polder"),
    hero = game.characters.hero;
  expect(place.group.visible).toBe(false);
  const view = [game.state.yaw, game.state.pitch, game.state.zoom];
  hero.position.set(-23, 0, -21);
  walk(game, "KeyW", 35);
  expect(game.state.area).toBe("polder");
  expect(place.group.visible).toBe(true);
  expect(game.worlds.garden.visible).toBe(false);
  expect(game.characters.companion.character.parent).toBe(place.group);
  expect(game.readProgress().discoveredPlaces).toContain("polder");
  expect(game.controls.openMap()).toBe(true);
  const stop = element("#travelDestinations").children.find(
    (entry) => entry.value === "polder",
  );
  expect(stop.attributes["aria-current"]).toBe("location");
  game.travelMap.close();
  hero.position.set(-18, 0, 30.6);
  frames(game, 50);
  expect(game.state.area).toBe("garden");
  expect(hero.position.toArray()).toEqual([-23, 0, -20]);
  expect([game.state.yaw, game.state.pitch, game.state.zoom]).toEqual(view);
  expect(game.controls.fastTravel("polder")).toBe(true);
  frames(game, 15);
  expect(game.state.area).toBe("polder");
});

test("only the drawbridge crosses the canal, and the tulip strips stay unwalked", async () => {
  const { game } = await createTestGame();
  const place = game.places.get("polder"),
    hero = game.characters.hero,
    terrain = place.terrain;
  // The polder only opens on the map after a first visit on foot.
  expect(game.controls.fastTravel("polder")).toBe(false);
  hero.position.set(-23, 0, -21);
  walk(game, "KeyW", 35);
  expect(game.state.area).toBe("polder");
  // Walking north from the towpath beside the bridge stops at the water.
  hero.position.set(8, 0, -12.4);
  walk(game, "KeyW", 30);
  expect(hero.position.z).toBeGreaterThan(-14.5);
  // On the bridge, the same walk reaches the windmill bank.
  hero.position.set(0, 0, -12.4);
  walk(game, "KeyW", 70);
  expect(hero.position.z).toBeLessThan(-22);
  expect(terrain.contains(6.5, 0)).toBe(false);
  expect(terrain.contains(0, 0)).toBe(true);
  expect(terrain.contains(0, 4)).toBe(true);
  // The furrows between strips stay open for photos among the tulips.
  expect(terrain.contains(7.2, 0)).toBe(true);
});

test("the windmill sails turn, a gust speeds them up, and the ducks come to be fed", async () => {
  const { game } = await createTestGame();
  const place = game.places.get("polder"),
    hero = game.characters.hero,
    { world } = place;
  hero.position.set(-23, 0, -21);
  walk(game, "KeyW", 35);
  expect(game.state.area).toBe("polder");
  const sails = world.sails;
  expect(sails.parent.name).toBe("windshaft");
  let start = sails.rotation.z;
  frames(game, 25);
  const calm = sails.rotation.z - start;
  expect(calm).toBeGreaterThan(0);

  hero.position.copy(world.windmillSpot);
  frames(game);
  expect(place.getHud().actions[0].label).toMatch(/sails/);
  expect(place.interact()).toBe(true);
  expect(world.gusting).toBe(true);
  frames(game, 50);
  start = sails.rotation.z;
  frames(game, 25);
  expect(sails.rotation.z - start).toBeGreaterThan(calm * 2);
  expect(place.getProgress().memories).toEqual(["windmill"]);

  hero.position.set(9, 0, -13.2);
  frames(game);
  expect(place.getHud().actions[0].label).toMatch(/ducks/);
  expect(place.interact()).toBe(true);
  expect(world.feeding).toBe(true);
  expect(place.getProgress().memories).toEqual(["windmill", "ducks"]);
  expect(place.getHud().progress).toBe("2 / 2 polder memories");

  place.reset();
  expect(place.getProgress().memories).toEqual([]);
  expect(world.gusting).toBe(false);
});
