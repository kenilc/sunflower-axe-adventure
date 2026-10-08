import { test } from "vitest";
import assert from "node:assert/strict";

test("location state and animation lifecycle", async () => {
  const { createLocationManager } =
    await import("../src/game/location-manager.js");
  const terrains = Object.fromEntries(
    [
      "garden",
      "cave",
      "riverside",
      "funfair",
      "village",
      "festival",
      "castle",
    ].map((name) => [name, { name }]),
  );
  let shop = null,
    summit = null,
    lagoon = null;
  const { createPlaceRegistry } = await import("../src/game/place-registry.js");
  const places = createPlaceRegistry();
  for (const [id, terrain] of Object.entries(terrains))
    places.register({
      id,
      terrain,
      kind: id === "castle" ? "room" : "area",
      parent: id === "castle" ? "summit" : undefined,
      legacyFlag: {
        riverside: "insideRiver",
        castle: "insideCastle",
        festival: "insideFestival",
        funfair: "insideFunfair",
      }[id],
    });
  places.register({
    id: "lagoon",
    kind: "context",
    parent: "riverside",
    terrain: { name: "lagoon" },
  });
  places.register({
    id: "summit",
    kind: "context",
    parent: "lagoon",
    terrain: { name: "summit" },
  });
  places.register({
    id: "shop",
    kind: "room",
    parent: "village",
    terrain: { name: "shop" },
  });
  places.get("riverside").resolve = () =>
    summit ? "summit" : lagoon ? "lagoon" : null;
  places.get("village").resolve = () => (shop ? "shop" : null);
  const locations = createLocationManager({ places });
  assert.equal(locations.current, "garden");
  assert.equal(locations.activeTerrain, terrains.garden);
  assert.throws(() => locations.setRoom("castle"));
  locations.setArea("riverside");
  lagoon = places.get("lagoon").terrain;
  assert.equal(locations.current, "lagoon");
  assert.equal(locations.activeTerrain, lagoon);
  summit = places.get("summit").terrain;
  assert.equal(locations.activeTerrain, summit);
  locations.setRoom("castle");
  assert.equal(locations.current, "castle");
  assert.equal(locations.activeTerrain, terrains.castle);
  assert(locations.state.insideRiver && locations.state.insideCastle);
  locations.setRoom(null);
  assert.equal(
    locations.activeTerrain,
    summit,
    "Leaving the room returns to the summit terrain",
  );
  locations.setArea("village");
  shop = places.get("shop").terrain;
  assert.equal(locations.current, "shop");
  assert.equal(locations.activeTerrain, shop);
  assert(!locations.state.insideRiver && !locations.state.insideCastle);
  locations.setArea("festival");
  assert(locations.state.insideFestival && !locations.state.insideFunfair);
  locations.setArea("funfair");
  assert(!locations.state.insideFestival && locations.state.insideFunfair);
  assert.throws(() => locations.setArea("castle"));
  assert.throws(() => locations.setArea("unknown"));
  assert.equal(
    locations.area,
    "funfair",
    "Invalid changes preserve the active area",
  );

  const { createGameLoop } = await import("../src/game/game-loop.js");
  const pending = new Map();
  let nextId = 0,
    updates = 0;
  const loop = createGameLoop(() => updates++, {
    requestFrame(callback) {
      pending.set(++nextId, callback);
      return nextId;
    },
    cancelFrame(id) {
      pending.delete(id);
    },
  });
  loop.start();
  loop.start();
  assert.equal(updates, 1);
  assert.equal(
    pending.size,
    1,
    "Repeated start must not create another animation loop",
  );
  const callback = pending.get(nextId);
  pending.delete(nextId);
  callback();
  assert.equal(updates, 2);
  assert.equal(pending.size, 1);
  loop.stop();
  assert.equal(pending.size, 0);
  callback();
  assert.equal(updates, 2, "A stale callback cannot update a stopped game");
  loop.start();
  assert.equal(updates, 3);
  loop.stop();
  console.log(
    "PASS: exclusive location state, nested castle return, shop/lagoon/summit terrain, invalid transitions, and animation start/stop/restart",
  );
});
