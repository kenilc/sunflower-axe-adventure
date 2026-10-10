import { afterEach, expect, test, vi } from "vitest";
import { createTestGame } from "./helpers/game.js";
import {
  createLocationSave,
  LOCATION_SAVE_KEY,
} from "../src/game/location-save.js";

afterEach(() => vi.unstubAllGlobals());

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: vi.fn((key, value) => values.set(key, value)),
  };
}

test("walking autosaves and page hide flushes the latest position and view", async () => {
  const storage = memoryStorage();
  const { game, handlers } = await createTestGame({ storage });
  game.rendering.clock.getDelta = () => 0.04;
  game.input.keys.KeyD = true;
  game.input.keys.KeyQ = true;
  for (let i = 0; i < 30; i++) game.update();
  game.input.keys.KeyD = game.input.keys.KeyQ = false;
  expect(
    JSON.parse(storage.getItem(LOCATION_SAVE_KEY)).position[0],
  ).toBeGreaterThan(0);
  expect(storage.setItem.mock.calls.length).toBeLessThan(5);
  game.update();
  const position = game.characters.hero.position.clone();
  const yaw = game.state.yaw;
  handlers.get("pagehide")();
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.state.activeLocation).toBe("garden");
  expect(resumed.characters.hero.position.distanceTo(position)).toBeLessThan(
    1e-7,
  );
  expect(resumed.state.yaw).toBe(yaw);
  expect(resumed.rendering.camera.fov).toBe(game.rendering.camera.fov);
});

test("the outer walking edge of the garden is saved and restored", async () => {
  const storage = memoryStorage();
  const { game, handlers } = await createTestGame({ storage });
  game.characters.hero.position.set(48.5, 0, 0);
  game.update();
  expect(game.characters.hero.position.x).toBe(48.5);
  handlers.get("pagehide")();
  expect(JSON.parse(storage.getItem(LOCATION_SAVE_KEY)).position).toEqual([
    48.5, 0,
  ]);
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.characters.hero.position.toArray()).toEqual([48.5, 0, 0]);
});

test.each([
  "cave",
  "riverside",
  "funfair",
  "village",
  "festival",
  "shop:bakery",
  "lagoon",
  "summit",
  "castle",
])("%s resumes its scenery, terrain and return route", async (id) => {
  const storage = memoryStorage();
  const { game, handlers } = await createTestGame({ storage });
  expect(game.transitions.restore(id)).toBe(true);
  handlers.get("pagehide")();
  const save = JSON.parse(storage.getItem(LOCATION_SAVE_KEY));
  expect(save.place).toBe(id);
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.state.activeLocation).toBe(id);
  const hero = resumed.characters.hero;
  expect(hero.position.x).toBeCloseTo(save.position[0], 7);
  expect(hero.position.z).toBeCloseTo(save.position[1], 7);
  const place = resumed.places.get(id);
  expect(place.group.visible).toBe(true);
  expect(resumed.characters.companion.character.parent).toBe(place.group);
  expect(hero.position.y).toBe(
    place.terrain.heightAt(hero.position.x, hero.position.z),
  );
  expect(resumed.activities.boatTrip.rowing).toBe(false);
  expect(resumed.activities.cableCar.riding).toBe(false);
  if (id === "lagoon") {
    expect(resumed.activities.boatTrip.atLagoon).toBe(true);
    hero.position.copy(resumed.activities.boatTrip.lagoonDock);
    resumed.controls.boardBoat();
    expect(resumed.activities.boatTrip.rowing).toBe(true);
    resumed.activities.boatTrip.update(9);
    expect(resumed.state.activeLocation).toBe("riverside");
  } else if (id === "summit") {
    expect(resumed.activities.cableCar.atSummit).toBe(true);
    hero.position.copy(resumed.activities.cableCar.summitDock);
    resumed.controls.boardCableCar();
    expect(resumed.activities.cableCar.riding).toBe(true);
    resumed.activities.cableCar.update(12);
    expect(resumed.state.activeLocation).toBe("lagoon");
  } else {
    resumed.transitions.jump(place.parent);
    expect(resumed.state.activeLocation).toBe(place.parent);
  }
});

test("hiding the tab saves walking but keeps the departure checkpoint during a boat trip", async () => {
  const storage = memoryStorage();
  const { game, handlers } = await createTestGame({ storage });
  game.transitions.open("riverside");
  game.characters.hero.position.copy(game.activities.boatTrip.riverDock);
  document.visibilityState = "hidden";
  handlers.get("visibilitychange")();
  const checkpoint = storage.getItem(LOCATION_SAVE_KEY);
  game.controls.boardBoat();
  game.activities.boatTrip.update(6);
  expect(game.activities.boatTrip.rowing).toBe(true);
  expect(game.activities.boatTrip.atLagoon).toBe(true);
  handlers.get("pagehide")();
  expect(storage.getItem(LOCATION_SAVE_KEY)).toBe(checkpoint);
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.state.activeLocation).toBe("riverside");
  expect(resumed.activities.boatTrip.nearby()).toBe(true);
  expect(resumed.activities.boatTrip.rowing).toBe(false);
});

test("New adventure replaces the checkpoint and leaves the photo album intact", async () => {
  const storage = memoryStorage();
  const { game, element, handlers } = await createTestGame({ storage });
  game.activities.photoAlbum.add("data:image/png;base64,d29vbGx5", "garden");
  game.transitions.open("village");
  handlers.get("pagehide")();
  game.controls.resetAdventure();
  expect(JSON.parse(storage.getItem(LOCATION_SAVE_KEY)).place).toBe("garden");
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.state.activeLocation).toBe("garden");
  expect(resumed.characters.hero.position.toArray()).toEqual([0, 0, 7]);
  expect(resumed.activities.photoAlbum.photos).toHaveLength(1);
});

test("an explicit area link overrides the checkpoint", async () => {
  const storage = memoryStorage();
  const { game, handlers } = await createTestGame({ storage });
  game.transitions.open("village");
  handlers.get("pagehide")();
  vi.stubGlobal("location", { search: "?area=cave&sound=off" });
  const { game: linked } = await createTestGame({ storage });
  expect(linked.state.activeLocation).toBe("cave");
  expect(JSON.parse(storage.getItem(LOCATION_SAVE_KEY)).place).toBe("cave");
});

test("invalid checkpoints and unavailable storage do not prevent startup or movement", async () => {
  const storage = memoryStorage();
  const { handlers } = await createTestGame({ storage });
  handlers.get("pagehide")();
  const valid = JSON.parse(storage.getItem(LOCATION_SAVE_KEY));
  for (const value of [
    "broken JSON",
    JSON.stringify({ ...valid, version: 99 }),
    JSON.stringify({ ...valid, place: "removed-place" }),
    JSON.stringify({ ...valid, position: [1e100, 0] }),
    JSON.stringify({ ...valid, position: [null, 0] }),
    JSON.stringify({ ...valid, view: { ...valid.view, zoom: -20 } }),
  ]) {
    storage.setItem(LOCATION_SAVE_KEY, value);
    const { game } = await createTestGame({ storage });
    expect(game.state.activeLocation).toBe("garden");
    expect(game.characters.hero.position.toArray()).toEqual([0, 0, 7]);
  }
  const blockedStorage = {
    getItem() {
      throw new Error("Storage blocked");
    },
    setItem() {
      throw new Error("Storage full");
    },
  };
  const { game, handlers: blockedHandlers } = await createTestGame({
    storage: blockedStorage,
  });
  game.rendering.clock.getDelta = () => 0.04;
  game.input.keys.KeyD = true;
  for (let i = 0; i < 30; i++) game.update();
  expect(game.characters.hero.position.x).toBeGreaterThan(0);
  expect(() => blockedHandlers.get("pagehide")()).not.toThrow();
});

test("the saver throttles changed positions, skips identical writes, and retries failed writes", () => {
  const storage = memoryStorage();
  const hero = { position: { x: 0, z: 7 }, rotation: { y: 0 } };
  let stable = true;
  const saver = createLocationSave({
    places: {
      has: (id) => id === "garden",
      get: () => ({ terrain: { contains: () => true, heightAt: () => 0 } }),
    },
    locations: { current: "garden" },
    hero,
    state: { yaw: 0, pitch: 0.3, zoom: 20 },
    camera: { fov: 43 },
    canSave: () => stable,
    storage: () => storage,
  });
  saver.update(0.01);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  hero.position.x = 1;
  saver.update(0.2);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  saver.update(0.8);
  expect(storage.setItem).toHaveBeenCalledTimes(2);
  saver.update(2);
  expect(storage.setItem).toHaveBeenCalledTimes(2);
  stable = false;
  hero.position.x = 99;
  saver.flush();
  expect(JSON.parse(storage.getItem(LOCATION_SAVE_KEY)).position).toEqual([
    1, 7,
  ]);
  stable = true;
  storage.setItem.mockImplementationOnce(() => {
    throw new Error("Full");
  });
  saver.flush();
  saver.update(1);
  expect(JSON.parse(storage.getItem(LOCATION_SAVE_KEY)).position).toEqual([
    99, 7,
  ]);
});
