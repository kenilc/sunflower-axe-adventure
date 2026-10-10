import { afterEach, expect, test, vi } from "vitest";
import { createTestGame } from "./helpers/game.js";
import { createJourney, JOURNEY_SAVE_KEY } from "../src/game/journey.js";
import { LOCATION_SAVE_KEY } from "../src/game/location-save.js";

afterEach(() => vi.unstubAllGlobals());

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
function frames(game, count = 12) {
  game.rendering.clock.getDelta = () => 0.04;
  for (let i = 0; i < count; i++) game.update();
}
function unlocked(game) {
  return game.readProgress().discoveredPlaces;
}
function destination(element, id) {
  return element("#travelDestinations").children.find(
    (button) => button.value === id,
  );
}

test("the map starts with only the garden, blocks locked travel and pauses all input", async () => {
  const { game, element, handlers } = await createTestGame();
  expect(unlocked(game)).toEqual(["garden"]);
  expect(game.controls.fastTravel("village")).toBe(false);
  game.input.keys.KeyW = true;
  const event = (code) => ({ code, repeat: false, preventDefault() {} });
  handlers.get("keydown")(event("KeyV"));
  expect(game.travelMap.open).toBe(true);
  expect(game.input.keys.KeyW).toBe(false);
  expect(destination(element, "garden").attributes["aria-current"]).toBe(
    "location",
  );
  expect(destination(element, "cave").disabled).toBe(true);
  expect(element("#travelSummary").textContent).toBe(
    "1 of 11 places discovered",
  );
  const position = game.characters.hero.position.clone();
  handlers.get("keydown")(event("KeyD"));
  handlers.get("keydown")(event("Space"));
  game.controls.fire();
  frames(game, 40);
  expect(game.characters.hero.position.equals(position)).toBe(true);
  expect(game.effects.axes).toHaveLength(0);
  expect(game.controls.travelTo("village")).toBe(false);
  expect(game.activities.photography.enter()).toBe(false);
  handlers.get("keydown")(event("Escape"));
  expect(game.travelMap.open).toBe(false);
  handlers.get("keydown")({ ...event("KeyV"), target: { tagName: "BUTTON" } });
  expect(game.travelMap.open).toBe(true);
  handlers.get("keydown")(event("KeyV"));
  expect(game.travelMap.open).toBe(false);
});

test("walking unlocks a destination, shops share the village stop and selecting the map travels safely", async () => {
  const storage = memoryStorage();
  const { game, element, handlers } = await createTestGame({ storage });
  expect(game.controls.travelTo("village")).toBe(true);
  frames(game);
  expect(unlocked(game)).toContain("village");
  game.transitions.jump("shop:bakery");
  game.worlds.village.stamps.add("bakery");
  game.update();
  expect(game.controls.openMap()).toBe(true);
  expect(destination(element, "village").attributes["aria-current"]).toBe(
    "location",
  );
  expect(destination(element, "garden").disabled).toBe(false);
  destination(element, "garden").onclick();
  expect(game.travelMap.open).toBe(false);
  expect(game.passageTransition.active).toBe(true);
  frames(game);
  expect(game.state.activeLocation).toBe("garden");
  expect(game.characters.hero.position.toArray()).toEqual([0, 0, 7]);
  expect(game.worlds.village.stamps.has("bakery")).toBe(true);
  expect(game.worlds.village.group.visible).toBe(false);
  expect(
    game.worlds.village.shops.every((shop) => !shop.room.group.visible),
  ).toBe(true);
  expect(game.characters.companion.character.parent).toBe(game.worlds.garden);
  expect(game.controls.fastTravel("village")).toBe(true);
  expect(game.controls.fastTravel("village")).toBe(false);
  frames(game);
  expect(game.state.activeLocation).toBe("village");
  handlers.get("pagehide")();
  const { game: resumed } = await createTestGame({ storage });
  expect(unlocked(resumed)).toEqual(["garden", "village"]);
  expect(resumed.state.activeLocation).toBe("village");
  expect(resumed.controls.fastTravel("garden")).toBe(true);
});

test("boat and cable-car destinations unlock on arrival and remain usable after travel between branches", async () => {
  const { game, handlers } = await createTestGame();
  game.transitions.open("festival");
  game.update();
  expect(unlocked(game)).toContain("funfair");
  expect(unlocked(game)).toContain("festival");
  game.transitions.jump("garden");
  game.transitions.open("riverside");
  game.update();
  const { boatTrip, cableCar } = game.activities;
  const { hero } = game.characters;
  hero.position.copy(boatTrip.riverDock);
  game.controls.boardBoat();
  boatTrip.update(6);
  game.update();
  expect(unlocked(game)).not.toContain("lagoon");
  expect(game.controls.openMap()).toBe(false);
  expect(game.controls.fastTravel("garden")).toBe(false);
  boatTrip.update(3);
  game.update();
  expect(unlocked(game)).toContain("lagoon");
  hero.position.copy(cableCar.islandDock);
  game.controls.boardCableCar();
  cableCar.update(6);
  game.update();
  expect(unlocked(game)).not.toContain("summit");
  expect(game.controls.fastTravel("festival")).toBe(false);
  cableCar.update(6);
  game.update();
  expect(unlocked(game)).toContain("summit");
  game.transitions.jump("castle");
  game.update();
  expect(unlocked(game)).toContain("castle");
  game.characters.rig.items.equip("ice-cream");
  expect(game.controls.fastTravel("festival")).toBe(true);
  frames(game);
  expect(game.state.activeLocation).toBe("festival");
  expect(
    game.characters.rig.body.getObjectByName("summer-t-shirt").visible,
  ).toBe(true);
  expect(game.worlds.castleRoom.group.visible).toBe(false);
  expect(game.worlds.riverside.group.visible).toBe(false);
  expect(boatTrip.lagoon.group.visible).toBe(false);
  expect(cableCar.group.visible).toBe(false);
  expect(game.characters.companion.character.parent).toBe(
    game.worlds.festival.group,
  );
  for (const id of [
    "castle",
    "village",
    "summit",
    "festival",
    "lagoon",
    "castle",
    "garden",
    "riverside",
  ]) {
    if (id === "village") {
      expect(game.controls.fastTravel(id)).toBe(false);
      continue;
    }
    expect(game.controls.fastTravel(id)).toBe(true);
    frames(game);
    expect(game.state.activeLocation).toBe(id);
    const place = game.places.get(id);
    expect(place.group.visible).toBe(true);
    expect(game.characters.companion.character.parent).toBe(place.group);
    expect(place.terrain.contains(hero.position.x, hero.position.z)).toBe(true);
    expect(game.characters.rig.items.current).toBe("ice-cream");
    if (id === "summit") {
      hero.position.copy(cableCar.summitDock);
      game.controls.boardCableCar();
      expect(cableCar.riding).toBe(true);
      cableCar.update(12);
      game.update();
    }
    if (id === "lagoon") {
      hero.position.copy(boatTrip.lagoonDock);
      game.controls.boardBoat();
      expect(boatTrip.rowing).toBe(true);
      boatTrip.update(9);
      game.update();
    }
  }
  expect(game.controls.fastTravel("castle")).toBe(true);
  frames(game);
  expect(game.controls.fastTravel("lagoon")).toBe(true);
  frames(game);
  expect(game.state.activeLocation).toBe("lagoon");
  expect(cableCar.atSummit).toBe(false);
  expect(cableCar.summit.group.visible).toBe(false);
  expect(game.worlds.castleRoom.group.visible).toBe(false);
  handlers.get("pagehide")();
});

test("map and fast travel respect other views, seated activities and restart", async () => {
  const storage = memoryStorage();
  const { game, element } = await createTestGame({ storage });
  game.transitions.open("village");
  game.update();
  element("#guide").open = true;
  expect(game.controls.openMap()).toBe(false);
  expect(game.controls.fastTravel("garden")).toBe(false);
  element("#guide").open = false;
  game.activities.photography.enter();
  expect(game.controls.openMap()).toBe(false);
  expect(game.controls.fastTravel("garden")).toBe(false);
  game.activities.photography.exit();
  game.activities.photography.openAlbum();
  expect(game.controls.fastTravel("garden")).toBe(false);
  game.activities.photography.closeAlbum();
  game.transitions.restore("castle");
  game.update();
  game.activities.bedRest.start();
  expect(game.controls.openMap()).toBe(false);
  expect(game.controls.fastTravel("garden")).toBe(false);
  game.controls.resetAdventure();
  expect(unlocked(game)).toEqual(["garden"]);
  expect(JSON.parse(storage.getItem(JOURNEY_SAVE_KEY)).discovered).toEqual([
    "garden",
  ]);
  const { game: fresh } = await createTestGame({ storage });
  expect(unlocked(fresh)).toEqual(["garden"]);
  expect(fresh.controls.fastTravel("castle")).toBe(false);
});

test("existing location saves unlock their visited route", async () => {
  const storage = memoryStorage();
  const { game, handlers } = await createTestGame({ storage });
  game.transitions.restore("castle");
  handlers.get("pagehide")();
  expect(JSON.parse(storage.getItem(LOCATION_SAVE_KEY)).place).toBe("castle");
  // Simulate a location save created before the travel map existed.
  storage.setItem(JOURNEY_SAVE_KEY, "null");
  const { game: resumed } = await createTestGame({ storage });
  expect(unlocked(resumed)).toEqual([
    "garden",
    "riverside",
    "lagoon",
    "summit",
    "castle",
  ]);
  expect(resumed.controls.fastTravel("funfair")).toBe(false);
});

test("journey storage filters unknown destinations and unavailable storage still allows discoveries", () => {
  const storage = memoryStorage();
  const parents = {
    garden: null,
    riverside: "garden",
    lagoon: "riverside",
    summit: "lagoon",
    castle: "summit",
  };
  const options = {
    places: {
      has: (id) => Object.hasOwn(parents, id),
      get: (id) => ({ parent: parents[id] }),
    },
    getCurrent: () => "garden",
    canTravel: () => true,
    transitions: { fastTravel: vi.fn(() => true) },
  };
  storage.setItem(
    JOURNEY_SAVE_KEY,
    JSON.stringify({
      version: 1,
      discovered: ["castle", "missing", "shop:bakery", 3],
    }),
  );
  const journey = createJourney({ ...options, storage: () => storage });
  expect(
    journey.destinations
      .filter((entry) => entry.unlocked)
      .map((entry) => entry.id),
  ).toEqual(["garden", "castle"]);
  expect(journey.travel("missing")).toBe(false);
  const blocked = createJourney({
    ...options,
    storage() {
      throw new Error("Blocked");
    },
  });
  expect(blocked.discover("castle")).toBe(true);
  expect(blocked.travel("castle")).toBe(true);
  expect(() => blocked.reset()).not.toThrow();
  expect(blocked.travel("castle")).toBe(false);
});

test("map paths match place parents and show the beach southeast of the garden", async () => {
  const { game, element } = await createTestGame();
  game.controls.openMap();
  const paths = element("#journeyPaths").children.map(
    ({ attributes }) => `${attributes["data-from"]}->${attributes["data-to"]}`,
  );
  expect(paths.sort()).toEqual(
    [
      "garden->cave",
      "garden->winter",
      "garden->village",
      "garden->funfair",
      "garden->riverside",
      "garden->seaside",
      "funfair->festival",
      "riverside->lagoon",
      "lagoon->summit",
      "summit->castle",
    ].sort(),
  );
  expect(paths).not.toContain("village->seaside");
  const locations = new Map(
    game.journey.destinations.map((entry) => [entry.id, entry]),
  );
  const garden = locations.get("garden");
  expect(locations.get("seaside").x).toBeGreaterThan(garden.x);
  expect(locations.get("seaside").y).toBeGreaterThan(garden.y);
  expect(locations.get("riverside").x).toBeLessThan(garden.x);
  expect(locations.get("funfair").x).toBeGreaterThan(garden.x);
  expect(locations.get("cave").y).toBeLessThan(garden.y);
  expect(locations.get("village").y).toBeGreaterThan(garden.y);
  expect(
    destination(element, "seaside").children.find(
      (child) => child.className === "travel-route",
    ).textContent,
  ).toBe("From Sunken Garden");
  game.travelMap.close();
  game.transitions.open("seaside");
  game.update();
  game.controls.openMap();
  const beachPath = element("#journeyPaths").children.find(
    ({ attributes }) => attributes["data-to"] === "seaside",
  );
  expect(beachPath.attributes["data-unlocked"]).toBe("true");
  expect(destination(element, "seaside").attributes["aria-current"]).toBe(
    "location",
  );
});
