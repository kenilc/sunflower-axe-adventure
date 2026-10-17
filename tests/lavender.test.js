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
async function sailToLavender() {
  const created = await createTestGame();
  const { game } = created;
  game.characters.hero.position.set(-23, 0, -21);
  walk(game, "KeyW", 35);
  expect(game.state.area).toBe("polder");
  const polder = game.places.get("polder");
  game.characters.hero.position.copy(polder.world.landing);
  frames(game);
  expect(polder.getHud().actions[0].label).toMatch(/Lavender Hills/);
  const moored = polder.world.trip.barge.position.clone();
  expect(polder.interact()).toBe(true);
  expect(polder.world.trip.sailing).toBe(true);
  frames(game, 20);
  // They sail off east, seated at the bow.
  expect(polder.world.trip.barge.position.x).toBeGreaterThan(moored.x + 0.6);
  frames(game, 60);
  expect(game.state.area).toBe("lavender");
  return created;
}

test("the barge sails from the polder to Lavender Hills and back", async () => {
  const { game, element } = await sailToLavender();
  const lavender = game.places.get("lavender"),
    polder = game.places.get("polder"),
    hero = game.characters.hero;
  expect(lavender.group.visible).toBe(true);
  expect(polder.group.visible).toBe(false);
  expect(game.readProgress().discoveredPlaces).toContain("lavender");
  expect(game.characters.rig.appearance.state.outfit).toBe("lavender");
  // The polder's barge is back at its landing, ready for next time.
  expect(polder.world.trip.sailing).toBe(false);
  expect(game.controls.openMap()).toBe(true);
  expect(
    element("#travelDestinations").children.find(
      (entry) => entry.value === "lavender",
    ).attributes["aria-current"],
  ).toBe("location");
  game.travelMap.close();

  // Back by the barge at the quay.
  expect(hero.position.distanceTo(lavender.world.quaySpot)).toBeLessThan(2.4);
  frames(game);
  expect(lavender.getHud().actions[0].label).toMatch(/polder/);
  expect(lavender.interact()).toBe(true);
  frames(game, 80);
  expect(game.state.area).toBe("polder");
  expect(game.characters.rig.appearance.state.outfit).toBe("polder");
  expect(hero.position.distanceTo(polder.world.landing)).toBeLessThan(2.4);
  expect(lavender.world.trip.sailing).toBe(false);
});

test("the hillside climbs to the village, and the lavender rows stay unwalked", async () => {
  const { game } = await sailToLavender();
  const lavender = game.places.get("lavender"),
    hero = game.characters.hero,
    terrain = lavender.terrain;
  // Up the gravel path from the quay to the square.
  hero.position.set(0, 0, 22);
  walk(game, "KeyW", 200);
  expect(hero.position.z).toBeLessThan(-14);
  expect(hero.position.y).toBeCloseTo(4, 1);
  expect(terrain.contains(4, 10)).toBe(false);
  expect(terrain.contains(2.3, 10)).toBe(true);
  // The furrows between rows stay open for photos.
  expect(terrain.contains(-4.85, 10)).toBe(true);
  // Nobody walks into the river.
  hero.position.set(-12, 0, 24.6);
  walk(game, "KeyS", 30);
  expect(hero.position.z).toBeLessThan(25.4);
});

test("cutting lavender, the market, a picnic under the oak and the bell make four memories", async () => {
  const { game } = await sailToLavender();
  const lavender = game.places.get("lavender"),
    hero = game.characters.hero,
    { world } = lavender;
  const goTo = (spot) => {
    hero.position.set(spot.x, world.heightAt(spot.x, spot.z), spot.z);
    frames(game);
  };
  goTo(new THREE.Vector3(2.3, 0, 8));
  expect(lavender.getHud().actions[0].label).toMatch(/lavender/i);
  expect(lavender.interact()).toBe(true);

  goTo(world.stalls[1].spot);
  expect(lavender.getHud().actions[0].label).toMatch(/bread/);
  expect(world.basket.visible).toBe(false);
  expect(lavender.interact()).toBe(true);
  expect(world.basket.visible).toBe(true);

  goTo(world.blanket.position.clone().add(new THREE.Vector3(0, 0, 1.4)));
  expect(lavender.getHud().actions[0].label).toMatch(/picnic/);
  expect(lavender.interact()).toBe(true);
  expect(lavender.canLeave()).toBe(false);
  frames(game, 90);
  expect(lavender.getProgress().memories).toContain("picnic");
  expect(lavender.interact()).toBe(true);
  expect(lavender.getProgress().picnic).toBe(false);

  goTo(world.bellSpot);
  expect(lavender.interact()).toBe(true);
  frames(game, 5);
  expect(Math.abs(world.bell.rotation.x)).toBeGreaterThan(0);
  expect(lavender.getProgress().memories).toEqual([
    "lavender",
    "market",
    "picnic",
    "bell",
  ]);
  expect(lavender.getHud().progress).toBe("4 / 4 lavender memories");
  lavender.reset();
  expect(lavender.getProgress().memories).toEqual([]);
  expect(world.basket.visible).toBe(false);
});

test("the camera stays above the hillside, even looking back up the slope", async () => {
  const { game } = await sailToLavender();
  const lavender = game.places.get("lavender"),
    hero = game.characters.hero,
    camera = game.rendering.camera,
    { world } = lavender;
  hero.position.set(0, world.heightAt(0, 6), 6);
  // Tilted as low as it goes, then turned right round her, including
  // looking down the hill from above it.
  game.input.keys.KeyF = true;
  frames(game, 60);
  game.input.keys.KeyF = false;
  game.input.keys.KeyQ = true;
  for (let turn = 0; turn < 12; turn++) {
    frames(game, 5);
    // Above the ground at the camera, and all along its view of her.
    for (let t = 0; t <= 1; t += 0.05) {
      const x = camera.position.x + (hero.position.x - camera.position.x) * t,
        z = camera.position.z + (hero.position.z - camera.position.z) * t,
        y = camera.position.y + (hero.position.y + 1.2 - camera.position.y) * t;
      expect(y).toBeGreaterThan(world.heightAt(x, z) + 0.2);
    }
  }
  game.input.keys.KeyQ = false;
});
