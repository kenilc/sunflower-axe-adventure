import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";
import { expectSolidScenery } from "./helpers/scenery.js";
import { LOCATION_SAVE_KEY } from "../src/game/location-save.js";

afterEach(() => vi.unstubAllGlobals());
function frames(game, count = 1) {
  game.rendering.clock.getDelta = () => 0.04;
  for (let i = 0; i < count; i++) game.update();
}
const key = (code) => ({ code, repeat: false, preventDefault() {} });

test("the log hut opens a warm sauna, water pouring and photos pause, and leaving restores the snowy walk", async () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const { game, element, handlers } = await createTestGame({ storage });
  game.transitions.open("winter");
  const place = game.places.get("winter"),
    sauna = place.world.sauna;
  const actors = [game.characters.hero, game.characters.companion.character];
  const rigs = [game.characters.rig, game.characters.companion.rig];
  const glasses = rigs[1].head.children.filter(
    (node) => node.userData.clothingSlot === "eyewear",
  );
  expect(glasses).toHaveLength(5);
  expect(glasses.every((node) => node.visible)).toBe(true);
  const hands = rigs.flatMap((rig) =>
    rig.hands.map((hand) => ({ hand, material: hand.material })),
  );
  const outdoor = place.group.getObjectByName("log-smoke-sauna");
  const snow = place.world.snowflakes;
  actors[0].position.copy(sauna.doorway).add(new THREE.Vector3(0, 0, 3));
  game.characters.companion.reset(
    actors[0].position,
    place.world.blockers,
    place.world,
  );
  game.input.keys.KeyW = true;
  frames(game, 16);
  game.input.keys.KeyW = false;
  expect(place.world.nearby(actors[0].position)).toBe("sauna");
  expect(
    place.world.blockers.every(
      ({ x, z, r }) =>
        Math.hypot(actors[0].position.x - x, actors[0].position.z - z) >=
        r + 0.38 - 1e-6,
    ),
  ).toBe(true);
  frames(game);
  expect(element("#placeAction").attributes["aria-label"]).toBe(
    "Enter sauna together · X",
  );
  game.characters.rig.items.equip("ice-cream");
  handlers.get("pagehide")();
  const checkpoint = storage.getItem(LOCATION_SAVE_KEY);
  const walking = actors.map((actor) => actor.position.clone());
  const background = game.rendering.scene.background.clone();
  const fog = game.rendering.scene.fog.density;
  const visible = new Map(
    place.group.children.map((node) => [node, node.visible]),
  );
  handlers.get("keydown")(key("KeyX"));
  expect(game.passageTransition.active).toBe(true);
  frames(game, 14);
  expect(place.activity.kind).toBe("sauna");
  expect(sauna.group.visible).toBe(true);
  expect(outdoor.visible).toBe(false);
  expect(snow.visible).toBe(false);
  expect(game.rendering.scene.fog.density).toBe(0);
  expect(glasses.every((node) => !node.visible)).toBe(true);
  for (const rig of rigs) {
    expect(rig.appearance.state.outfit).toBe("sauna");
    expect(rig.body.getObjectByName("sauna-towel-wrap").visible).toBe(true);
    expect(rig.body.getObjectByName("sauna-linen-robe")).toBeUndefined();
    rig.arms.forEach((arm) =>
      expect(arm.getObjectByName("sauna-bare-arm").visible).toBe(true),
    );
    rig.legs.forEach((leg, i) => {
      const foot = leg.getObjectByName("sauna-bare-foot");
      expect(foot.visible).toBe(true);
      expect(foot.quaternion.equals(rig.feet[i].quaternion)).toBe(true);
      expect(rig.feet[i].visible).toBe(false);
    });
    rig.body.traverse((node) => {
      if (node.userData.outfit === "winter")
        expect(node.visible, node.name).toBe(false);
    });
    expect(rig.held.visible).toBe(false);
  }
  hands.forEach(({ hand, material }) => {
    expect(hand.material).not.toBe(material);
    expect(hand.material.color.getHex()).toBe(0xf0bd8a);
  });
  expect(game.controls.openMap()).toBe(false);
  expect(game.controls.openKeepsakes()).toBe(false);
  expectSolidScenery(game.rendering.scene, "sauna");
  handlers.get("pagehide")();
  expect(storage.getItem(LOCATION_SAVE_KEY)).toBe(checkpoint);
  const seated = actors[0].position.clone();
  handlers.get("keydown")(key("KeyB"));
  frames(game, 20);
  expect(place.activity.pouring).toBe(true);
  expect(actors[0].position.equals(seated)).toBe(false);
  expect(sauna.ladle.parent).toBe(rigs[0].rightHand);
  expect(place.activity.pourWater()).toBe(false);
  const steam = () =>
    sauna.steam.map(({ puff }) => [
      puff.position.toArray(),
      puff.material.opacity,
    ]);
  const paused = steam(),
    time = sauna.elapsed,
    position = actors[0].position.clone();
  element("#guide").open = true;
  frames(game, 25);
  expect(steam()).toEqual(paused);
  expect(sauna.elapsed).toBe(time);
  element("#guide").open = false;
  expect(game.activities.photography.enter()).toBe(true);
  frames(game, 50);
  expect(actors[0].position.equals(position)).toBe(true);
  expect(steam()).toEqual(paused);
  expect(game.activities.photoMode.canEditActors).toBe(false);
  expect(glasses.every((node) => !node.visible)).toBe(true);
  expectSolidScenery(game.rendering.scene, "sauna photo");
  expect(game.activities.photography.takePhoto()).toBe(true);
  expect(game.activities.photoAlbum.photos[0].location).toContain(
    "Sauna warmth for two",
  );
  game.activities.photography.exit();
  frames(game, 80);
  expect(place.activity.pouring).toBe(false);
  expect(actors[0].position.equals(seated)).toBe(true);
  expect(sauna.ladle.parent.name).toBe("sauna-water-bucket");
  expect(sauna.steam.some(({ puff }) => puff.material.opacity > 0.07)).toBe(
    true,
  );
  frames(game, 60);
  expect(place.activity.memories.has("sauna")).toBe(true);
  expect(place.getProgress().totalMemories).toBe(4);
  handlers.get("keydown")(key("KeyX"));
  frames(game, 5);
  expect(place.activity.active).toBe(false);
  expect(sauna.group.visible).toBe(false);
  expect(game.rendering.scene.background.equals(background)).toBe(true);
  expect(game.rendering.scene.fog.density).toBe(fog);
  visible.forEach((value, node) => expect(node.visible, node.name).toBe(value));
  actors.forEach((actor, i) =>
    expect(actor.position.equals(walking[i])).toBe(true),
  );
  rigs.forEach((rig) => expect(rig.appearance.state.outfit).toBe("winter"));
  expect(glasses.every((node) => node.visible)).toBe(true);
  hands.forEach(({ hand, material }) => expect(hand.material).toBe(material));
  expect(game.characters.rig.items.current).toBe("ice-cream");
  expect(game.characters.rig.held.visible).toBe(true);
  frames(game, 6);
  expect(game.controls.openMap()).toBe(true);
  game.travelMap.close();
  game.transitions.jump("garden");
  game.transitions.open("winter");
  expect(place.activity.memories.has("sauna")).toBe(true);
  expect(sauna.group.visible).toBe(false);
});

test("reloading a sauna moment restores the door checkpoint, and restart restores lighting, clothes and the ladle", async () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const { game, handlers } = await createTestGame({ storage });
  game.transitions.open("winter");
  const place = game.places.get("winter");
  game.characters.hero.position.copy(place.world.saunaSpot);
  frames(game);
  handlers.get("pagehide")();
  const walking = game.characters.hero.position.clone();
  place.activity.start("sauna");
  place.activity.pourWater();
  frames(game, 10);
  handlers.get("pagehide")();
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.state.area).toBe("winter");
  expect(resumed.characters.hero.position.equals(walking)).toBe(true);
  expect(resumed.places.get("winter").activity.active).toBe(false);
  expect(resumed.places.get("winter").world.sauna.group.visible).toBe(false);
  resumed.transitions.jump("garden");
  const gardenColor = resumed.rendering.scene.background.clone();
  const initialFog = resumed.rendering.scene.fog.density;
  resumed.transitions.open("winter", { activity: "sauna" });
  const winter = resumed.places.get("winter");
  expect(winter.activity.kind).toBe("sauna");
  winter.activity.pourWater();
  frames(resumed, 10);
  resumed.controls.resetAdventure();
  frames(resumed);
  expect(resumed.state.area).toBe("garden");
  expect(winter.activity.active).toBe(false);
  expect(winter.activity.memories.size).toBe(0);
  expect(winter.world.sauna.group.visible).toBe(false);
  expect(winter.world.sauna.ladle.parent.name).toBe("sauna-water-bucket");
  expect(resumed.characters.rig.appearance.state.outfit).toBe("winter");
  expect(resumed.characters.rig.held.visible).toBe(true);
  expect(
    resumed.characters.companion.rig.head.children
      .filter((node) => node.userData.clothingSlot === "eyewear")
      .every((node) => node.visible),
  ).toBe(true);
  expect(resumed.rendering.scene.fog.density).toBe(initialFog);
  // Reset restores the garden environment, rather than leaking sauna lighting.
  expect(resumed.rendering.scene.background.equals(gardenColor)).toBe(true);
});
