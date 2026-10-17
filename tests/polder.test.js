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
  // The Blender cows graze: their heads dip and their tails swish.
  const cow = world.group.getObjectByName("cow");
  const head = cow.getObjectByName("head"),
    tail = cow.getObjectByName("tail");
  const pose = [head.rotation.x, tail.rotation.y];
  frames(game, 10);
  expect([head.rotation.x, tail.rotation.y]).not.toEqual(pose);
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
  // Only the ducks on her side of the bridge come; none swims through it.
  expect(place.getHud().actions[0].label).toMatch(/ducks/);
  expect(place.interact()).toBe(true);
  expect(world.feeding).toBe(true);
  expect(place.getProgress().memories).toEqual(["windmill", "ducks"]);
  expect(place.getHud().progress).toBe("2 / 7 polder memories");
  for (let i = 0; i < 150; i++) {
    frames(game);
    for (const { duck, side } of world.ducks)
      expect(Math.sign(duck.position.x) * Math.abs(duck.position.x)).toSatisfy(
        (x) => Math.sign(x) === side && Math.abs(x) >= 3.4 - 1e-6,
      );
  }
  const fed = world.ducks.filter(({ side }) => side > 0);
  for (const { duck } of fed)
    expect(Math.abs(duck.position.z - world.canal.south)).toBeLessThan(2.2);

  place.reset();
  expect(place.getProgress().memories).toEqual([]);
  expect(world.gusting).toBe(false);
});

async function enterPolder() {
  const created = await createTestGame();
  const { game } = created;
  game.characters.hero.position.set(-23, 0, -21);
  walk(game, "KeyW", 35);
  expect(game.state.area).toBe("polder");
  return created;
}

test("the farmhouse door leads into the kitchen for stroopwafels and turning cheeses", async () => {
  const { game } = await enterPolder();
  const polder = game.places.get("polder"),
    farm = game.places.get("polder:farm"),
    hero = game.characters.hero;
  // The walls block; only the doorway lets her in.
  hero.position.set(polder.world.farmDoor.x + 3, 0, polder.world.farmDoor.z);
  walk(game, "KeyW", 30);
  expect(game.state.activeLocation).toBe("polder");
  hero.position.copy(polder.world.farmDoor);
  frames(game, 40);
  expect(game.state.activeLocation).toBe("polder:farm");
  expect(farm.group.visible).toBe(true);
  expect(polder.group.visible).toBe(false);

  hero.position.copy(farm.terrain.tableSpot);
  frames(game);
  expect(farm.getHud().actions[0].label).toMatch(/stroopwafels/);
  expect(farm.interact()).toBe(true);
  expect(farm.canLeave()).toBe(false);
  frames(game, 120);
  expect(polder.memories.has("table")).toBe(true);
  expect(farm.interact()).toBe(true);
  expect(hero.position.y).toBe(0);

  hero.position.copy(farm.terrain.cheeseSpot);
  frames(game);
  expect(farm.interact()).toBe(true);
  frames(game, 120);
  expect(polder.memories.has("cheese")).toBe(true);
  expect(farm.getProgress().moment).toBe(null);

  hero.position.set(0, 0, 5.9);
  frames(game, 40);
  expect(game.state.activeLocation).toBe("polder");
  expect(polder.group.visible).toBe(true);
  expect(hero.position.z).toBeGreaterThan(polder.world.farmDoor.z + 1);
});

test("inside the windmill the stones grind, and the ladder leads out onto the stage", async () => {
  const { game } = await enterPolder();
  const polder = game.places.get("polder"),
    mill = game.places.get("polder:mill"),
    stage = game.places.get("polder:stage"),
    hero = game.characters.hero;
  hero.position.copy(polder.world.millDoor);
  frames(game, 40);
  expect(game.state.activeLocation).toBe("polder:mill");
  const runner = mill.group.getObjectByName("runner");
  const turned = runner.rotation.y;
  frames(game, 10);
  expect(runner.rotation.y).toBeGreaterThan(turned);

  hero.position.set(0, 0, 3.1);
  frames(game);
  expect(mill.getHud().actions[0].label).toMatch(/flour/);
  expect(mill.interact()).toBe(true);
  expect(polder.memories.has("flour")).toBe(true);

  hero.position.set(0, 0, -5.3);
  frames(game);
  expect(mill.getHud().actions[0].label).toMatch(/stage/);
  expect(mill.interact()).toBe(true);
  frames(game, 40);
  expect(game.state.activeLocation).toBe("polder:stage");
  expect(polder.group.visible).toBe(true);
  expect(mill.group.visible).toBe(false);
  expect(polder.memories.has("stage")).toBe(true);
  // She walks the stage at deck height, all the way round, and he follows.
  expect(hero.position.y).toBeCloseTo(4.27);
  const { x: cx, z: cz } = polder.world.windmill.position;
  const angle = () => Math.atan2(hero.position.x - cx, hero.position.z - cz);
  const start = angle();
  walk(game, "KeyD", 60);
  expect(Math.abs(angle() - start)).toBeGreaterThan(0.3);
  expect(stage.terrain.contains(hero.position.x, hero.position.z)).toBe(true);
  const companion = game.characters.companion.character;
  expect(companion.position.y).toBeCloseTo(4.27);

  // Back down the ladder and out of the door.
  hero.position
    .set(cx, 4.27, cz)
    .add(
      new THREE.Vector3(Math.sin(0.35), 0, Math.cos(0.35)).multiplyScalar(4.3),
    );
  frames(game);
  expect(stage.getHud().actions[0].visible).toBe(true);
  expect(stage.interact()).toBe(true);
  frames(game, 40);
  expect(game.state.activeLocation).toBe("polder:mill");
  expect(hero.position.y).toBe(0);
  hero.position.set(0, 0, 6.1);
  frames(game, 40);
  expect(game.state.activeLocation).toBe("polder");
});

test("the friends ride the clogs around the polder, his following hers", async () => {
  const { game } = await enterPolder();
  const polder = game.places.get("polder"),
    hero = game.characters.hero,
    companion = game.characters.companion.character,
    { clogs } = polder.world;
  hero.position.set(8.8, 0, 24.6);
  frames(game);
  expect(polder.getHud().actions[0].label).toMatch(/clogs/);
  expect(polder.interact()).toBe(true);
  expect(polder.clogs.riding).toBe(true);
  expect(polder.canLeave()).toBe(false);
  const start = clogs[0].group.position.clone();
  // Round his clog to the south, west to the main path, then north up it.
  for (const [code, count] of [
    ["KeyS", 25],
    ["KeyA", 45],
    ["KeyW", 120],
  ])
    walk(game, code, count);
  const lead = clogs[0].group.position,
    follower = clogs[1].group.position;
  expect(lead.distanceTo(start)).toBeGreaterThan(8);
  // She sits in her clog and he in his, on open ground, close behind.
  expect(
    Math.hypot(hero.position.x - lead.x, hero.position.z - lead.z),
  ).toBeLessThan(0.6);
  expect(
    Math.hypot(
      companion.position.x - follower.x,
      companion.position.z - follower.z,
    ),
  ).toBeLessThan(0.6);
  expect(lead.distanceTo(follower)).toBeLessThan(5);
  for (const clog of clogs)
    expect(
      polder.terrain.contains(clog.group.position.x, clog.group.position.z),
    ).toBe(true);
  expect(clogs[0].blocker.x).toBe(lead.x);

  expect(polder.interact()).toBe(true);
  expect(polder.clogs.riding).toBe(false);
  expect(hero.position.y).toBe(0);
  expect(polder.terrain.contains(hero.position.x, hero.position.z)).toBe(true);
  // The clogs stay parked where they stopped until the polder resets.
  expect(lead.distanceTo(start)).toBeGreaterThan(8);
  polder.reset();
  expect(
    clogs.some((clog) => clog.group.position.distanceTo(start) < 1e-6),
  ).toBe(true);
});
