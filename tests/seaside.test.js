import * as THREE from "three";
import { LOCATION_SAVE_KEY } from "../src/game/location-save.js";
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

test("surf and gulls animate during exploration and freeze in paused views", async () => {
  const { game, element } = await createTestGame();
  game.transitions.open("seaside");
  const beach = game.places.get("seaside").terrain;
  const { waves, birds, shoreBirds } = beach.ambience;
  const snapshot = () => ({
    foam: Array.from(waves[0].foam.geometry.attributes.position.array),
    flight: birds[0].bird.position.toArray(),
    wings: birds.map(({ wings }) => wings[0].rotation.z),
    shore: shoreBirds[0].bird.position.toArray(),
  });
  const before = snapshot();
  frames(game, 25);
  const moving = snapshot();
  expect(moving.foam).not.toEqual(before.foam);
  expect(moving.flight).not.toEqual(before.flight);
  expect(moving.wings).not.toEqual(before.wings);
  expect(moving.shore).not.toEqual(before.shore);
  expect(moving.foam.every(Number.isFinite)).toBe(true);
  element("#guide").open = true;
  frames(game, 20);
  expect(snapshot()).toEqual(moving);
  element("#guide").open = false;
  game.controls.openKeepsakes();
  frames(game, 20);
  expect(snapshot()).toEqual(moving);
  game.activities.collection.close();
  game.activities.photography.enter();
  frames(game, 20);
  expect(snapshot()).toEqual(moving);
  game.activities.photography.exit();
  frames(game, 10);
  expect(snapshot().flight).not.toEqual(moving.flight);
  const p = game.characters.hero.position;
  expect(beach.contains(p.x, p.z)).toBe(true);
});

test("beach clothing preserves identities and restores other outfits on departure, reload, travel and restart", async () => {
  const storage = memoryStorage();
  const { game, element, handlers } = await createTestGame({ storage });
  const rigs = [game.characters.rig, game.characters.companion.rig];
  const originalFootMaterials = rigs.map((rig) => rig.leftFoot.material);
  game.transitions.open("seaside");
  frames(game);
  for (const rig of rigs) {
    expect(rig.appearance.state.outfit).toBe("beach");
    expect(rig.body.getObjectByName("beach-shirt").visible).toBe(true);
    expect(rig.leftLeg.getObjectByName("beach-sandal").visible).toBe(true);
    expect(rig.leftFoot.visible).toBe(false);
  }
  expect(rigs[0].head.getObjectByName("flower-petal-0").visible).toBe(true);
  expect(rigs[1].head.getObjectByName("companion-hair-fringe-0").visible).toBe(
    true,
  );
  expect(
    rigs[1].head.children
      .filter((node) => node.userData.clothingSlot === "headwear")
      .every((node) => !node.visible),
  ).toBe(true);
  handlers.get("pagehide")();
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.state.area).toBe("seaside");
  expect(resumed.characters.rig.appearance.state.outfit).toBe("beach");
  expect(game.controls.travelTo("garden")).toBe(true);
  frames(game);
  rigs.forEach((rig, i) => {
    expect(rig.appearance.state.outfit).toBe("winter");
    expect(rig.body.getObjectByName("beach-shirt").visible).toBe(false);
    expect(rig.leftFoot.visible).toBe(true);
    expect(rig.leftFoot.material).toBe(originalFootMaterials[i]);
  });
  expect(game.controls.fastTravel("seaside")).toBe(true);
  frames(game);
  expect(rigs[0].appearance.state.outfit).toBe("beach");
  // Another place's outfit takes over after restoring the beach overrides.
  game.transitions.restore("festival");
  expect(rigs[0].appearance.state.outfit).toBe("summer");
  game.transitions.restore("seaside");
  expect(rigs[0].appearance.state.outfit).toBe("beach");
  element("#restart").onclick();
  rigs.forEach((rig) => {
    expect(rig.appearance.state.outfit).toBe("winter");
    expect(rig.body.getObjectByName("beach-shirt").visible).toBe(false);
  });
});

test("sea, sand and surf extend beyond the camera's view along both ends of the coast", async () => {
  const { game } = await createTestGame();
  game.transitions.open("seaside");
  const beach = game.places.get("seaside").terrain;
  beach.group.updateWorldMatrix(true, true);
  for (const x of [-400, 400]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(x, 20, -100),
      new THREE.Vector3(0, -1, 0),
    );
    expect(ray.intersectObject(beach.sea).length).toBeGreaterThan(0);
    ray.ray.origin.z = 5;
    expect(ray.intersectObject(beach.sand).length).toBeGreaterThan(0);
    ray.ray.origin.z = -22;
    expect(ray.intersectObject(beach.wetSand).length).toBeGreaterThan(0);
  }
  const foam = beach.ambience.waves[0].foam.geometry.attributes.position;
  expect(foam.getX(0)).toBeLessThan(-400);
  expect(foam.getX(foam.count - 1)).toBeGreaterThan(400);
  expect(beach.contains(400, 0)).toBe(false);
});

test("towels seat both friends, keep the last walking save, and restore walking and held items", async () => {
  const storage = memoryStorage();
  const { game, element, handlers } = await createTestGame({ storage });
  game.transitions.open("seaside");
  const place = game.places.get("seaside"),
    spot = place.terrain.sunsetSpot;
  const hero = game.characters.hero,
    companion = game.characters.companion;
  hero.position.copy(spot.group.position).add(new THREE.Vector3(0, 0, 2.5));
  companion.reset(hero.position, place.terrain.blockers, place.terrain);
  companion.rig.items.equip("ice-cream");
  frames(game, 3);
  handlers.get("pagehide")();
  const checkpoint = JSON.parse(storage.getItem(LOCATION_SAVE_KEY));
  const walking = hero.position.clone();
  const legPositions = game.characters.rig.legs.map((leg) =>
    leg.position.clone(),
  );
  expect(element("#placeAction").textContent).toBe("Sit & watch sunset · X");
  game.controls.interact();
  expect(place.rest.seated).toBe(true);
  expect(companion.rig.held.visible).toBe(false);
  expect(game.readProgress().placeProgress.resting).toBe(true);
  const seated = hero.position.clone();
  const wave = Array.from(
    place.terrain.ambience.waves[1].foam.geometry.attributes.position.array,
  );
  game.input.keys.KeyW = true;
  frames(game, 25);
  expect(hero.position.equals(seated)).toBe(true);
  expect(companion.character.position.x - hero.position.x).toBeCloseTo(1.6);
  expect(
    Array.from(
      place.terrain.ambience.waves[1].foam.geometry.attributes.position.array,
    ),
  ).not.toEqual(wave);
  expect(element("#sunsetStand").textContent).toBe("Stand up · X");
  expect(element("#stick").hidden).toBe(true);
  expect(game.controls.openMap()).toBe(false);
  expect(game.controls.openKeepsakes()).toBe(false);
  expect(game.activities.photography.enter()).toBe(false);
  expect(game.controls.travelTo("garden")).toBe(false);
  expect(game.controls.fastTravel("garden")).toBe(false);
  vi.spyOn(performance, "now").mockReturnValue(60_000);
  game.update();
  expect(element("#toast").style.opacity).toBe(0);
  const bodyY = game.characters.rig.body.position.y;
  element("#guide").open = true;
  frames(game, 10);
  expect(game.characters.rig.body.position.y).toBe(bodyY);
  game.controls.interact();
  expect(place.rest.seated).toBe(true);
  element("#guide").open = false;
  handlers.get("pagehide")();
  expect(JSON.parse(storage.getItem(LOCATION_SAVE_KEY))).toEqual(checkpoint);
  game.controls.interact();
  expect(place.rest.seated).toBe(false);
  expect(hero.position.equals(walking)).toBe(true);
  game.characters.rig.legs.forEach((leg, i) =>
    expect(leg.position.equals(legPositions[i])).toBe(true),
  );
  expect(companion.rig.held.visible).toBe(true);
  expect(companion.rig.items.current).toBe("ice-cream");
  expect(game.input.keys.KeyW).toBe(false);
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.places.get("seaside").rest.seated).toBe(false);
  expect(resumed.characters.hero.position.y).toBe(0);
  expect(resumed.characters.hero.position.equals(walking)).toBe(true);
});

test("sunset activity links and restarting restore the seated pose without leaving overrides", async () => {
  const { game, element } = await createTestGame();
  const originalY = game.characters.rig.leftLeg.position.y;
  game.transitions.open("seaside", { activity: "sunset" });
  const place = game.places.get("seaside");
  frames(game, 20);
  expect(place.rest.seated).toBe(true);
  expect(place.terrain.sunsetSpot.umbrella.name).toBe("sunset-parasol");
  expect(game.characters.rig.appearance.state.outfit).toBe("beach");
  element("#restart").onclick();
  expect(place.rest.seated).toBe(false);
  expect(game.state.area).toBe("garden");
  expect(game.characters.hero.position.toArray()).toEqual([0, 0, 7]);
  expect(game.characters.rig.leftLeg.position.y).toBe(originalY);
  expect(game.characters.rig.appearance.state.outfit).toBe("winter");
  expect(game.characters.rig.items.canThrow).toBe(true);
});
