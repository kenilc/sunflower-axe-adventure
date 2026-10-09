import { afterEach, expect, test, vi } from "vitest";
import { createTestGame } from "./helpers/game.js";
import {
  createKeepsakes,
  KEEPSAKES_KEY,
  BEACH_FINDS,
} from "../src/systems/keepsakes.js";

afterEach(() => vi.unstubAllGlobals());
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}
function frames(game, count = 15) {
  game.rendering.clock.getDelta = () => 0.04;
  for (let i = 0; i < count; i++) game.update();
}
const key = (code) => ({ code, repeat: false, preventDefault() {} });

test("keepsakes validate saved finds, persist once, and preserve data on storage failure", () => {
  const storage = memoryStorage(),
    collection = createKeepsakes({ storage: () => storage });
  expect(collection.collect("pearl-shell")).toBe(true);
  expect(collection.collect("pearl-shell")).toBe(false);
  expect(() => collection.collect("unknown")).toThrow();
  const saved = storage.getItem(KEEPSAKES_KEY);
  expect(createKeepsakes({ storage: () => storage }).items).toEqual(
    collection.items,
  );
  storage.setItem = () => {
    throw new Error("quota");
  };
  expect(() => collection.collect("rose-stone")).toThrow();
  expect(collection.items).toHaveLength(1);
  expect(storage.getItem(KEEPSAKES_KEY)).toBe(saved);
  const valid = JSON.parse(saved)[0];
  const loaded = createKeepsakes({
    storage: () => ({
      getItem: () =>
        JSON.stringify([
          valid,
          valid,
          { id: "unknown", createdAt: valid.createdAt },
          { id: "rose-stone", createdAt: "no date" },
        ]),
    }),
  });
  expect(loaded.items).toHaveLength(1);
  expect(
    createKeepsakes({ storage: () => ({ getItem: () => "{" }) }).loadError,
  ).toBe(true);
  expect(
    createKeepsakes({
      storage: () => {
        throw new Error("disabled");
      },
    }).loadError,
  ).toBe(true);
});

test("the garden path opens a walkable sunset beach, collection pauses play, and return restores the garden", async () => {
  const { game, element, handlers } = await createTestGame({
    storage: memoryStorage(),
  });
  const hero = game.characters.hero,
    beach = game.places.get("seaside").terrain;
  const background = game.rendering.scene.background.getHex();
  hero.position.set(23, 0, 21);
  game.input.keys.KeyS = true;
  frames(game, 40);
  game.input.keys.KeyS = false;
  expect(game.state.area).toBe("seaside");
  expect(beach.group.visible).toBe(true);
  expect(game.worlds.garden.visible).toBe(false);
  expect(game.characters.companion.character.parent).toBe(beach.group);
  expect(game.readProgress().discoveredPlaces).toContain("seaside");
  expect(element("#throw").hidden).toBe(true);
  hero.position.set(29, 0, 0);
  game.input.keys.KeyD = true;
  frames(game, 10);
  expect(hero.position.x).toBeLessThanOrEqual(29);
  expect(
    beach.contains(
      game.characters.companion.character.position.x,
      game.characters.companion.character.position.z,
    ),
  ).toBe(true);
  game.input.keys.KeyD = false;
  hero.position.set(0, 0, -17.9);
  game.input.keys.KeyW = true;
  frames(game, 10);
  game.input.keys.KeyW = false;
  expect(hero.position.z).toBeGreaterThanOrEqual(-18);
  hero.position.set(-4, 0, 11);
  game.update();
  handlers.get("keydown")(key("KeyX"));
  expect(game.readProgress().beachKeepsakes).toBe(1);
  expect(beach.finds[0].model.visible).toBe(false);
  game.input.keys.KeyW = true;
  handlers.get("keydown")(key("KeyK"));
  expect(game.activities.collection.open).toBe(true);
  expect(game.input.keys.KeyW).toBe(false);
  expect(element("#keepsakesName").textContent).toBe("Pearl scallop");
  expect(element("#keepsakesGrid").children).toHaveLength(1);
  element("#keepsakes-stone").onclick();
  expect(element("#keepsakesDetail").hidden).toBe(true);
  expect(element("#keepsakesEmpty").hidden).toBe(false);
  element("#keepsakes-all").onclick();
  expect(element("#keepsakesDetail").hidden).toBe(false);
  const position = hero.position.clone();
  handlers.get("keydown")(key("KeyW"));
  frames(game);
  expect(hero.position.equals(position)).toBe(true);
  expect(game.controls.openMap()).toBe(false);
  expect(game.controls.fastTravel("garden")).toBe(false);
  expect(game.controls.travelTo("garden")).toBe(false);
  expect(game.activities.photography.enter()).toBe(false);
  expect(game.activities.photography.openAlbum()).toBe(false);
  handlers.get("keydown")(key("Escape"));
  expect(game.activities.collection.open).toBe(false);
  element("#guide").open = true;
  expect(game.controls.openKeepsakes()).toBe(false);
  element("#guide").open = false;
  // The old invisible trigger must not return us from an empty patch of sand.
  hero.position.set(0, 0, 23);
  frames(game);
  expect(game.state.area).toBe("seaside");
  // Walk toward the visible return arch, rather than teleporting to a trigger.
  hero.position
    .copy(beach.returnGate.group.position)
    .add({ x: 0, y: 0, z: -3 });
  game.input.keys.KeyS = true;
  frames(game, 40);
  game.input.keys.KeyS = false;
  expect(game.state.area).toBe("garden");
  expect(hero.position.toArray()).toEqual([23, 0, 21]);
  expect(game.rendering.scene.background.getHex()).toBe(background);
  expect(beach.group.visible).toBe(false);
});

test("all beach finds survive reload, revisits, and New adventure with saved locations and map travel", async () => {
  const storage = memoryStorage();
  const { game, element, handlers } = await createTestGame({ storage });
  game.transitions.open("seaside");
  frames(game);
  const beach = game.places.get("seaside").terrain;
  for (const find of beach.finds) {
    game.characters.hero.position.copy(find.model.position).setY(0);
    game.update();
    element("#placeAction").onclick();
  }
  expect(game.activities.keepsakes.items).toHaveLength(BEACH_FINDS.length);
  expect(beach.finds.every(({ model }) => !model.visible)).toBe(true);
  expect(game.readProgress().placeProgress).toMatchObject({
    collected: 12,
    shells: 6,
    stones: 6,
  });
  handlers.get("pagehide")();
  const { game: resumed, element: resumedElement } = await createTestGame({
    storage,
  });
  expect(resumed.state.area).toBe("seaside");
  expect(resumed.activities.keepsakes.items).toHaveLength(12);
  expect(
    resumed.places
      .get("seaside")
      .terrain.finds.every(({ model }) => !model.visible),
  ).toBe(true);
  expect(resumed.controls.fastTravel("garden")).toBe(true);
  frames(resumed);
  expect(resumed.controls.fastTravel("seaside")).toBe(true);
  frames(resumed);
  expect(resumed.state.area).toBe("seaside");
  expect(resumed.controls.openKeepsakes()).toBe(true);
  resumedElement("#restart").onclick();
  expect(resumed.activities.collection.open).toBe(false);
  expect(resumed.state.area).toBe("garden");
  expect(resumed.activities.keepsakes.items).toHaveLength(12);
  expect(resumed.readProgress().discoveredPlaces).toEqual(["garden"]);
});

test("a failed save leaves a find on the beach for retry and paused actions cannot collect", async () => {
  const storage = memoryStorage();
  const { game, element } = await createTestGame({ storage });
  game.transitions.open("seaside");
  frames(game);
  const beach = game.places.get("seaside").terrain;
  game.characters.hero.position.copy(beach.finds[0].model.position).setY(0);
  game.update();
  const write = storage.setItem;
  storage.setItem = () => {
    throw new Error("quota");
  };
  game.controls.interact();
  expect(beach.finds[0].model.visible).toBe(true);
  expect(game.activities.keepsakes.items).toHaveLength(0);
  storage.setItem = write;
  element("#guide").open = true;
  element("#placeAction").onclick();
  expect(game.activities.keepsakes.items).toHaveLength(0);
  element("#guide").open = false;
  game.controls.interact();
  expect(game.activities.keepsakes.items).toHaveLength(1);
  game.activities.photography.enter();
  expect(game.controls.openKeepsakes()).toBe(false);
  game.activities.photography.exit();
  game.controls.openMap();
  expect(game.controls.openKeepsakes()).toBe(false);
});

test("shell arches keep their triggers aligned, offer X at both ends, and respect paused views", async () => {
  const { game, element } = await createTestGame();
  const beach = game.places.get("seaside").terrain,
    hero = game.characters.hero;
  hero.position
    .copy(beach.entranceGate.group.position)
    .add({ x: 0, y: 0, z: -3 });
  game.update();
  expect(element("#placeAction").textContent).toBe("Visit Sunset Beach · X");
  element("#guide").open = true;
  game.controls.interact();
  expect(game.passageTransition.active).toBe(false);
  element("#guide").open = false;
  game.controls.interact();
  frames(game);
  expect(game.state.area).toBe("seaside");
  const gate = beach.returnGate;
  expect(gate.group.getObjectByName("pearl-shell-crest")).toBeTruthy();
  expect(gate.contains(gate.group.position)).toBe(true);
  expect(
    gate.contains(gate.group.position.clone().add({ x: 2.3, y: 0, z: 0 })),
  ).toBe(false);
  // Moving the visible arch also moves the doorway detection.
  const old = gate.group.position.clone();
  gate.group.position.x -= 6;
  expect(gate.contains(old)).toBe(false);
  expect(gate.contains(gate.group.position)).toBe(true);
  hero.position.copy(gate.group.position).add({ x: 0, y: 0, z: -3 });
  game.update();
  expect(element("#placeAction").textContent).toBe("Return to garden · X");
  game.controls.openKeepsakes();
  game.controls.interact();
  expect(game.passageTransition.active).toBe(false);
  game.activities.collection.close();
  element("#placeAction").onclick();
  frames(game);
  expect(game.state.area).toBe("garden");
  expect(hero.position.toArray()).toEqual([23, 0, 21]);
});
