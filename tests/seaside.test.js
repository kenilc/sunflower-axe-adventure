import * as THREE from "three";
import { LOCATION_SAVE_KEY } from "../src/game/location-save.js";
import { afterEach, expect, test, vi } from "vitest";
import { createTestGame } from "./helpers/game.js";
import { createBeachAmbience } from "../src/locations/seaside/ambience.js";
import { createMeshFactory } from "../src/rendering/mesh-factory.js";
import { createPhotoAlbum } from "../src/systems/photo-album.js";
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
    shore: shoreBirds.map(({ bird, head }) => [
      bird.position.toArray(),
      head.rotation.x,
    ]),
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
  expect(game.activities.photography.enter()).toBe(true);
  game.activities.photography.exit();
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

test("sandcastles build together in three stages, pause and cancel safely, and can be rebuilt", async () => {
  const storage = memoryStorage();
  const { game, element, handlers } = await createTestGame({ storage });
  game.transitions.open("seaside");
  const place = game.places.get("seaside"),
    castle = place.terrain.sandcastle;
  const hero = game.characters.hero,
    companion = game.characters.companion;
  hero.position.copy(castle.group.position).add(new THREE.Vector3(0, 0, 3.4));
  companion.reset(hero.position, place.terrain.blockers, place.terrain);
  companion.rig.items.equip("ice-cream");
  frames(game, 3);
  handlers.get("pagehide")();
  const checkpoint = storage.getItem(LOCATION_SAVE_KEY),
    walking = hero.position.clone();
  const leg = game.characters.rig.leftLeg.quaternion.clone();
  const legPosition = game.characters.rig.leftLeg.position.clone();
  game.controls.interact();
  expect(place.activity.active).toBe(true);
  expect(companion.rig.held.visible).toBe(false);
  const kneeling = hero.position.clone();
  game.input.keys.KeyW = true;
  frames(game, 20);
  expect(hero.position.equals(kneeling)).toBe(true);
  expect(game.controls.openMap()).toBe(false);
  expect(game.controls.openKeepsakes()).toBe(false);
  expect(game.activities.photography.enter()).toBe(true);
  game.activities.photography.exit();
  expect(game.controls.travelTo("garden")).toBe(false);
  element("#guide").open = true;
  frames(game, 160);
  expect(castle.stage).toBe(0);
  expect(place.activity.active).toBe(true);
  element("#guide").open = false;
  handlers.get("pagehide")();
  expect(storage.getItem(LOCATION_SAVE_KEY)).toBe(checkpoint);
  game.controls.interact();
  expect(place.activity.active).toBe(false);
  expect(hero.position.equals(walking)).toBe(true);
  expect(game.characters.rig.leftLeg.quaternion.equals(leg)).toBe(true);
  expect(companion.rig.held.visible).toBe(true);
  expect(castle.stage).toBe(0);
  for (let stage = 1; stage <= 3; stage++) {
    game.controls.interact();
    frames(game, 115);
    expect(place.activity.active).toBe(false);
    expect(castle.stage).toBe(stage);
    expect(castle.stages.map((part) => part.visible)).toEqual([
      true,
      stage >= 2,
      stage >= 3,
    ]);
    expect(game.characters.rig.leftLeg.position.equals(legPosition)).toBe(true);
  }
  expect(game.readProgress().placeProgress.sandcastleStage).toBe(3);
  frames(game, 1);
  expect(element("#placeAction").textContent).toBe("Admire our castle · X");
  element("#sandcastleReset").onclick();
  expect(castle.stage).toBe(0);
  game.controls.interact();
  element("#restart").onclick();
  expect(place.activity.active).toBe(false);
  expect(castle.stage).toBe(0);
  expect(game.characters.rig.items.canThrow).toBe(true);
  expect(game.characters.rig.appearance.state.outfit).toBe("winter");
});

test("tide pools are approachable, inspectable, animated, and restore the walking pose", async () => {
  const { game, element } = await createTestGame();
  game.transitions.open("seaside", { activity: "tidepool" });
  const place = game.places.get("seaside"),
    life = place.terrain.shoreLife;
  expect(place.activity.active).toBe(true);
  expect(life.pools).toHaveLength(2);
  const pool = life.pools[0];
  const ripple = pool.ripple.scale.x;
  frames(game, 30);
  expect(pool.ripple.scale.x).not.toBe(ripple);
  element("#guide").open = true;
  const pausedRipple = pool.ripple.scale.x;
  frames(game, 30);
  expect(pool.ripple.scale.x).toBe(pausedRipple);
  element("#guide").open = false;
  frames(game, 100);
  expect(place.activity.active).toBe(true);
  expect(element("#toast").textContent).toContain("starfish");
  game.controls.interact();
  expect(place.activity.active).toBe(false);
  expect(game.characters.hero.position.y).toBe(0);
  for (const spot of life.pools) {
    const approach = spot.group.position
      .clone()
      .add(new THREE.Vector3(0, 0, 3.5));
    expect(place.terrain.contains(approach.x, approach.z)).toBe(true);
    expect(
      place.terrain.blockers.every(
        (b) => Math.hypot(b.x - approach.x, b.z - approach.z) > b.r + 0.65,
      ),
    ).toBe(true);
    game.characters.hero.position.copy(approach);
    frames(game, 1);
    expect(element("#placeAction").textContent).toBe("Explore tide pool · X");
    game.controls.interact();
    expect(place.activity.active).toBe(true);
    game.controls.interact();
    expect(place.activity.active).toBe(false);
    expect(game.characters.hero.position.equals(approach)).toBe(true);
  }
});

test("footprints remain bounded, fade away, and do not draw teleport trails", async () => {
  const { game } = await createTestGame();
  game.transitions.open("seaside");
  const life = game.places.get("seaside").terrain.shoreLife;
  const hero = game.characters.hero,
    companion = game.characters.companion.character;
  life.resetTracks();
  hero.position.x += 1;
  life.update(0.04);
  const matrix = new THREE.Matrix4();
  const visible = () => {
    let count = 0;
    for (let i = 0; i < life.footprints.count; i++) {
      life.footprints.getMatrixAt(i, matrix);
      if (matrix.elements[0] !== 0 || matrix.elements[2] !== 0) count++;
    }
    return count;
  };
  expect(visible()).toBe(1);
  hero.position.x += 10;
  life.update(0.04);
  expect(visible()).toBe(1);
  for (let i = 0; i < 140; i++) {
    hero.position.x += i % 2 ? -1 : 1;
    companion.position.z += i % 2 ? -1 : 1;
    life.update(0.04);
  }
  expect(life.footprints.count).toBe(120);
  expect(visible()).toBe(120);
  life.update(31);
  expect(visible()).toBe(0);
});

test("gulls steer smoothly between varied destinations with independent flap and glide intervals", () => {
  const group = new THREE.Group();
  const ambience = createBeachAmbience({
    parent: group,
    helpers: createMeshFactory(group),
  });
  expect(
    new Set(ambience.birds.map(({ flight }) => flight.routeLeft)).size,
  ).toBe(7);
  expect(
    new Set(ambience.birds.map(({ flight }) => flight.flapRate)).size,
  ).toBe(7);
  const firstTarget = ambience.birds[0].flight.target.clone();
  const glideDurations = [],
    flapDurations = [];
  for (let i = 0; i < 1600; i++) {
    const modes = ambience.birds.map(({ flight }) => flight.gliding);
    const positions = ambience.birds.map(({ bird }) => bird.position.clone());
    ambience.update(0.04);
    ambience.birds.forEach(({ bird, flight }, j) => {
      expect(bird.position.distanceTo(positions[j])).toBeLessThan(0.18);
      expect(bird.position.toArray().every(Number.isFinite)).toBe(true);
      if (modes[j] !== flight.gliding)
        (flight.gliding ? glideDurations : flapDurations).push(flight.modeLeft);
    });
  }
  expect(ambience.birds[0].flight.target.equals(firstTarget)).toBe(false);
  expect(new Set(glideDurations).size).toBeGreaterThan(10);
  expect(new Set(flapDurations).size).toBeGreaterThan(10);
  expect(
    glideDurations.every((duration) => duration >= 3.5 && duration <= 11),
  ).toBe(true);
  expect(
    flapDurations.every((duration) => duration >= 0.9 && duration <= 2.8),
  ).toBe(true);
});

test("walking faces the direction of travel after restoring a north-facing beach activity pose", async () => {
  const { game } = await createTestGame();
  game.transitions.open("seaside");
  const place = game.places.get("seaside"),
    hero = game.characters.hero;
  const companion = game.characters.companion.character;
  const camera = game.rendering.camera;
  for (const activity of ["pool", "castle", "castle-complete", "sunset"]) {
    const spot =
      activity === "pool"
        ? place.terrain.shoreLife.pools[0]
        : activity.startsWith("castle")
          ? place.terrain.sandcastle
          : place.terrain.sunsetSpot;
    hero.position.copy(spot.group.position).add(new THREE.Vector3(0, 0, 3.3));
    hero.rotation.set(0, Math.PI, 0);
    if (activity === "sunset") {
      expect(place.rest.sit()).toBe(true);
      place.rest.stand(false);
    } else {
      expect(
        place.activity.start(activity === "pool" ? "pool" : "castle", spot),
      ).toBe(true);
      if (activity === "castle-complete") frames(game, 115);
      else place.activity.cancel(false);
      expect(place.activity.active).toBe(false);
    }
    const restored = hero.quaternion.clone();
    for (const orbitFrames of [0, 15]) {
      game.input.keys.KeyQ = true;
      frames(game, orbitFrames);
      game.input.keys.KeyQ = false;
      for (const keys of [
        ["KeyW"],
        ["KeyS"],
        ["KeyA"],
        ["KeyD"],
        ["KeyW", "KeyD"],
        ["KeyS", "KeyA"],
      ]) {
        // An open patch of sand isolates facing from obstacle deflections.
        hero.position.set(0, 0, 15);
        companion.position.set(8, 0, 15);
        hero.quaternion.copy(restored);
        const start = hero.position.clone();
        keys.forEach((code) => (game.input.keys[code] = true));
        frames(game, 1);
        keys.forEach((code) => (game.input.keys[code] = false));
        const direction = hero.position.clone().sub(start).setY(0).normalize();
        const forward = new THREE.Vector3(0, 0, 1)
          .applyQuaternion(hero.quaternion)
          .setY(0)
          .normalize();
        expect(direction.length()).toBeGreaterThan(0.9);
        expect(forward.dot(direction)).toBeCloseTo(1, 6);
        expect(
          new THREE.Vector3(0, 1, 0).applyQuaternion(hero.quaternion).y,
        ).toBeCloseTo(1, 6);
        expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
      }
    }
  }
});

test("palm trunks block walking without covering finds, and only obstructing palms fade", async () => {
  const { game } = await createTestGame();
  game.transitions.open("seaside");
  const beach = game.places.get("seaside").terrain,
    landscape = beach.landscape;
  const tree = landscape.palms[0].group,
    hero = game.characters.hero;
  const trunk = beach.blockers.find(
    (blocker) => blocker.x === tree.position.x && blocker.z === tree.position.z,
  );
  hero.position.copy(tree.position).add(new THREE.Vector3(3, 0, 0));
  game.input.keys.KeyA = true;
  frames(game, 28);
  game.input.keys.KeyA = false;
  expect(
    Math.hypot(
      hero.position.x - tree.position.x,
      hero.position.z - tree.position.z,
    ),
  ).toBeGreaterThanOrEqual(trunk.r + 0.38 - 1e-6);
  for (const find of beach.finds)
    for (const palm of landscape.palms.filter(({ near }) => near)) {
      expect(
        find.model.position.distanceTo(palm.group.position),
      ).toBeGreaterThan(1.5);
    }
  const camera = game.rendering.camera;
  hero.position.copy(tree.position).add(new THREE.Vector3(0, 0, 4));
  camera.position.copy(tree.position).add(new THREE.Vector3(0, 1.4, -4));
  landscape.visibility.update(camera, [hero], 0.5);
  expect(tree.children[0].material.opacity).toBeLessThan(0.2);
  expect(landscape.palms[1].group.children[0].material.opacity).toBe(1);
  camera.position.copy(tree.position).add(new THREE.Vector3(10, 3, 1));
  landscape.visibility.update(camera, [hero], 0.5);
  expect(tree.children[0].material.opacity).toBeGreaterThan(0.99);
});

test.each(["sunset", "sandcastle", "tidepool"])(
  "photos preserve the %s activity pose, face the pair, and resume the moment after saving",
  async (kind) => {
    const storage = memoryStorage();
    const { game, element, handlers } = await createTestGame({ storage });
    game.transitions.open("seaside");
    const place = game.places.get("seaside"),
      hero = game.characters.hero;
    const spot =
      kind === "sunset"
        ? place.terrain.sunsetSpot
        : kind === "sandcastle"
          ? place.terrain.sandcastle
          : place.terrain.shoreLife.pools[0];
    hero.position
      .copy(spot.group.position)
      .add(new THREE.Vector3(0, 0, kind === "sunset" ? 2.5 : 3.5));
    frames(game, 3);
    handlers.get("pagehide")();
    const checkpoint = storage.getItem(LOCATION_SAVE_KEY);
    game.controls.interact();
    frames(game, 15);
    const posedNodes = [
      hero,
      game.characters.companion.character,
      ...[game.characters.rig, game.characters.companion.rig].flatMap((rig) => [
        rig.body,
        rig.head,
        ...rig.legs,
        ...rig.arms,
      ]),
    ];
    const pose = posedNodes.map((node) => ({
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
    }));
    const photo = game.activities.photography,
      mode = game.activities.photoMode,
      camera = game.rendering.camera;
    const view = camera.position.clone(),
      viewRotation = camera.quaternion.clone();
    const remaining = place.activity.secondsLeft;
    element("#cameraAction").onclick();
    expect(mode.active).toBe(true);
    expect(mode.canEditActors).toBe(false);
    expect(element("#photoHint").textContent).toContain("Activity paused");
    expect(element("#photoKeyboard").textContent).toContain(
      "poses are held in place",
    );
    for (const actor of [hero, game.characters.companion.character]) {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
        actor.quaternion,
      );
      const towardCamera = camera.position
        .clone()
        .sub(actor.position)
        .setY(0)
        .normalize();
      expect(forward.dot(towardCamera)).toBeGreaterThan(0.75);
    }
    const savedFraming = mode.settings.yaw;
    mode.selectActor(0);
    mode.moveSelected(hero.position.clone().add(new THREE.Vector3(2, 0, 2)));
    mode.turnSelected(100);
    mode.adjustActor(1, { x: 2, heading: 180 });
    expect(mode.selectedActor).toBe(null);
    mode.rotate(100, 0);
    expect(mode.settings.yaw).not.toBe(savedFraming);
    mode.zoomByScale(0.9);
    game.input.keys.KeyW = true;
    frames(game, 160);
    expect(place.activity.secondsLeft).toBe(remaining);
    posedNodes.forEach((node, i) => {
      expect(node.position.equals(pose[i].position)).toBe(true);
      expect(node.quaternion.equals(pose[i].quaternion)).toBe(true);
    });
    expect(photo.takePhoto()).toBe(true);
    expect(game.activities.photoAlbum.photos[0].location).toContain(
      kind === "sunset"
        ? "Sunset for two"
        : kind === "sandcastle"
          ? "Shape the base"
          : "Discovering the tide pool",
    );
    expect(createPhotoAlbum({ storage: () => storage }).photos).toHaveLength(1);
    expect(photo.openAlbum()).toBe(true);
    frames(game, 10);
    photo.closeAlbum();
    handlers.get("pagehide")();
    expect(storage.getItem(LOCATION_SAVE_KEY)).toBe(checkpoint);
    mode.reset();
    expect(mode.settings.yaw).toBe(savedFraming);
    photo.exit();
    expect(camera.position.equals(view)).toBe(true);
    expect(camera.quaternion.equals(viewRotation)).toBe(true);
    expect(game.input.keys.KeyW).toBe(false);
    expect(kind === "sunset" ? place.rest.seated : place.activity.active).toBe(
      true,
    );
    frames(game, 110);
    if (kind === "sandcastle") {
      expect(place.terrain.sandcastle.stage).toBe(1);
      expect(place.activity.active).toBe(false);
    } else {
      expect(
        kind === "sunset" ? place.rest.seated : place.activity.active,
      ).toBe(true);
      game.controls.interact();
      expect(hero.position.y).toBe(0);
    }
    expect(photo.enter()).toBe(true);
    expect(mode.canEditActors).toBe(true);
    photo.exit();
  },
);
