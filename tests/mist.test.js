import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";
import {
  WANDER_ROUTES,
  streamX,
  walkable,
} from "../src/locations/mist/world.js";

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
  // Into the polder through its garden sign.
  game.characters.hero.position.set(-23, 0, -21);
  walk(game, "KeyW", 35);
  expect(game.state.area).toBe("polder");
  const polder = game.places.get("polder");
  game.characters.hero.position.copy(polder.world.balloonSpot);
  frames(game);
  expect(polder.getHud().actions[0].label).toMatch(/misty forest/);
  const ground = polder.world.trip.balloon.position.y;
  expect(polder.interact()).toBe(true);
  expect(polder.world.trip.flying).toBe(true);
  frames(game, 20);
  // They rise, standing in the basket.
  expect(polder.world.trip.balloon.position.y).toBeGreaterThan(ground + 0.2);
  frames(game, 60);
  expect(game.state.area).toBe("mist");
  return created;
}

test("the balloon flies from the polder to Mistwood Hollow and back", async () => {
  const { game } = await flyToMist();
  const mist = game.places.get("mist"),
    polder = game.places.get("polder"),
    hero = game.characters.hero;
  expect(mist.group.visible).toBe(true);
  expect(polder.group.visible).toBe(false);
  expect(game.readProgress().discoveredPlaces).toContain("mist");
  expect(game.characters.rig.appearance.state.outfit).toBe("mist");
  // The polder's balloon is back on the canal bank.
  expect(polder.world.trip.flying).toBe(false);
  expect(polder.world.trip.balloon.position.y).toBe(0);

  hero.position.copy(mist.world.balloonSpot);
  frames(game);
  expect(mist.getHud().actions[0].label).toMatch(/polder/);
  expect(mist.interact()).toBe(true);
  frames(game, 80);
  expect(game.state.area).toBe("polder");
  expect(game.characters.rig.appearance.state.outfit).toBe("polder");
  expect(hero.position.distanceTo(polder.world.balloonSpot)).toBeLessThan(2);
  expect(mist.world.trip.flying).toBe(false);
});

test("the lantern path leads from the meadow to the clearing, and the forest stays unwalked", async () => {
  const { game } = await flyToMist();
  const mist = game.places.get("mist"),
    hero = game.characters.hero,
    { terrain } = mist;
  // Follow the path north, keeping to its curve.
  for (let i = 0; i < 500 && hero.position.z > 3; i++) {
    const ahead = hero.position.z - 1;
    const steer = 3.2 * Math.sin(ahead * 0.22) - hero.position.x;
    game.input.keys.KeyW = true;
    game.input.keys.KeyA = steer < -0.3;
    game.input.keys.KeyD = steer > 0.3;
    frames(game);
  }
  Object.assign(game.input.keys, { KeyW: false, KeyA: false, KeyD: false });
  expect(hero.position.z).toBeLessThan(3.5);
  expect(terrain.contains(0, -6)).toBe(true);
  // Deep among the trees, and off the board, are out of bounds.
  expect(terrain.contains(-13, 18)).toBe(false);
  expect(terrain.contains(-14, 30)).toBe(false);
  // Nobody walks into the pond.
  hero.position.set(0, 0, -8);
  walk(game, "KeyW", 40);
  expect(
    Math.hypot(
      hero.position.x - mist.world.pond.x,
      hero.position.z - mist.world.pond.z,
    ),
  ).toBeGreaterThan(mist.world.pond.r);
});

test("greeting the mist puffs, visiting every house, a lantern and a rest make four memories", async () => {
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

  // Each door leads into the house; the friends come back out onto the
  // stepping stones, and the house gives a happy wiggle.
  for (const [i, house] of world.houses.entries()) {
    const room = game.places.get(`mist:${house.kind}`);
    goTo(house.door);
    frames(game, 40);
    expect(game.state.activeLocation).toBe(`mist:${house.kind}`);
    expect(room.group.visible).toBe(true);
    expect(mist.group.visible).toBe(false);
    hero.position.set(0, 0, 6.4);
    frames(game, 40);
    expect(game.state.activeLocation).toBe("mist");
    expect(hero.position.distanceTo(house.outside)).toBeLessThan(1);
    frames(game, 3);
    expect(house.home.scale.y).not.toBe(house.home.scale.x);
    if (i === 0) expect(mist.getProgress().memories).not.toContain("houses");
  }
  expect(mist.getProgress().housesVisited).toBe(5);

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
  expect(mist.getProgress().housesVisited).toBe(0);
  expect(world.floating[0].boat.visible).toBe(false);
});

test("each house is too big to walk through except at its door, and roomy inside", async () => {
  const { game } = await flyToMist();
  const mist = game.places.get("mist"),
    hero = game.characters.hero,
    [frog] = mist.world.houses;
  // Walking at the house beside the door bumps into its head.
  const side = new THREE.Vector3(-frog.facing.z, 0, frog.facing.x);
  hero.position.copy(frog.outside).addScaledVector(side, 3.5);
  hero.lookAt(hero.position.clone().sub(frog.facing));
  game.input.keys.KeyW = true;
  frames(game, 60);
  game.input.keys.KeyW = false;
  expect(game.state.activeLocation).toBe("mist");
  expect(hero.position.distanceTo(frog.home.position)).toBeGreaterThan(4);

  for (const kind of ["frog", "cat", "rabbit", "owl", "turtle"]) {
    const room = game.places.get(`mist:${kind}`);
    // Furniture to walk round, a curved back wall, and space in the middle.
    expect(room.terrain.blockers.length).toBeGreaterThanOrEqual(2);
    expect(room.terrain.contains(0, 0)).toBe(true);
    expect(room.terrain.contains(0, -6.4)).toBe(false);
    expect(room.terrain.isExit(room.terrain.arrival)).toBe(false);
  }
});

test("the bigger hollow has a toadstool grove and a berry patch over the stream", async () => {
  const { game } = await flyToMist();
  const { terrain, world } = game.places.get("mist");
  for (const corner of [world.grove, world.berries, world.bridge])
    expect(terrain.contains(corner.x, corner.z)).toBe(true);
  // The stream is crossed only by the bridge.
  expect(terrain.contains(streamX(-20), -20)).toBe(false);
  expect(terrain.contains(streamX(10), 10)).toBe(false);
  expect(terrain.contains(0, 53.5)).toBe(false);
  // The fern lawns south of the meadow and the corners can be walked.
  for (const [x, z] of [
    [0, 44],
    [world.berries.x, world.berries.z + 12],
    [world.grove.x, world.grove.z + 12],
  ])
    expect(terrain.contains(x, z)).toBe(true);
});

test("the forest animals stroll their routes, and stop to look at the friends", async () => {
  const { game } = await flyToMist();
  const { world } = game.places.get("mist"),
    hero = game.characters.hero;
  const moving = world.animals.filter((a) => a.obstacle);
  const scenery = world.blockers.filter(
    (b) => !moving.some((a) => a.obstacle === b),
  );
  // Every leg of every route keeps to open ground, clear of the scenery.
  for (const [kind, route] of Object.entries(WANDER_ROUTES))
    route.forEach(([x, z], i) => {
      const [nx, nz] = route[(i + 1) % route.length];
      for (let t = 0; t <= 1; t += 0.05) {
        const px = x + (nx - x) * t,
          pz = z + (nz - z) * t;
        expect(walkable(px, pz), `${kind} at ${px}, ${pz}`).toBe(true);
        for (const b of scenery)
          expect(
            Math.hypot(px - b.x, pz - b.z),
            `${kind} at ${px}, ${pz}`,
          ).toBeGreaterThan(b.r + 0.45);
      }
    });
  // Away from the friends, they walk on.
  hero.position.set(0, 0, 20);
  game.characters.companion.reset(hero.position, world.blockers, world);
  const fox = world.animals.find((a) => a.kind === "fox");
  const start = fox.group.position.clone();
  frames(game, 150);
  expect(fox.group.position.distanceTo(start)).toBeGreaterThan(1);
  // With her close by it keeps strolling, slower, and steps round her.
  hero.position.copy(fox.group.position).add(new THREE.Vector3(1.6, 0, 0));
  const near = fox.group.position.clone();
  let closest = Infinity;
  for (let i = 0; i < 200; i++) {
    frames(game);
    closest = Math.min(closest, fox.group.position.distanceTo(hero.position));
  }
  expect(fox.group.position.distanceTo(near)).toBeGreaterThan(0.5);
  expect(closest).toBeGreaterThan(1);
});

test("an animal comes to stand beside the friends for a photo of all three", async () => {
  const { game } = await flyToMist();
  const mist = game.places.get("mist"),
    { world } = mist,
    hero = game.characters.hero;
  const squirrel = world.animals.find((a) => a.kind === "squirrel");
  hero.position.set(world.berries.x - 1, 0, world.berries.z + 1);
  game.characters.companion.reset(hero.position, world.blockers, world);
  squirrel.group.position.set(world.berries.x + 1, 0, world.berries.z + 1);
  frames(game);
  expect(mist.getHud().actions[0].label).toMatch(/photo with the squirrel/);
  expect(mist.interact()).toBe(true);
  frames(game, 60);
  expect(world.posing).toBe(squirrel);
  const gap = squirrel.group.position.distanceTo(hero.position);
  expect(gap).toBeGreaterThan(1.4);
  expect(gap).toBeLessThan(2.4);
  // All three face the same way, and the photo frames them together.
  expect(Math.cos(squirrel.group.rotation.y - hero.rotation.y)).toBeGreaterThan(
    0.85,
  );
  const preset = mist.getPhotoPreset();
  expect(Math.abs(preset.yaw - squirrel.posing.facing)).toBeLessThan(1);
  expect(
    preset.target.clone().setY(0).distanceTo(hero.position.clone().setY(0)),
  ).toBeLessThan(2.5);
  expect(mist.photoLocation()).toMatch(/squirrel/);
  // In Camera mode it stands three-quarters to the lens, whichever way
  // the view is turned: never its back, and never a straight stare.
  game.rendering.camera.position
    .copy(squirrel.group.position)
    .add(new THREE.Vector3(-6, 3, -6));
  mist.photoVisibility(game.rendering.camera, [hero], 0.04, true);
  const lens = Math.atan2(-6, -6);
  expect(Math.cos(squirrel.group.rotation.y - lens)).toBeGreaterThan(0.85);
  // Walking on says goodbye.
  hero.position.x -= 4;
  frames(game);
  expect(world.posing).toBe(null);
  expect(mist.getPhotoPreset()).toBeUndefined();
});
