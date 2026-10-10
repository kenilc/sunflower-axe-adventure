import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";
import { expectSolidScenery } from "./helpers/scenery.js";
import { LOCATION_SAVE_KEY } from "../src/game/location-save.js";
import { SNOWMAN_STEP_SECONDS } from "../src/locations/winter/snowman-building.js";

afterEach(() => vi.unstubAllGlobals());
const key = (code) => ({ code, repeat: false, preventDefault() {} });
function frames(game, count = 1) {
  game.rendering.clock.getDelta = () => 0.04;
  for (let i = 0; i < count; i++) game.update();
}
function storageInMemory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
function approach(game, place, kind) {
  const spot =
    kind === "snowman"
      ? place.world.snowman.position
      : kind === "skate"
        ? place.world.skateSpot
        : kind === "sauna"
          ? place.world.saunaSpot
          : place.world.cocoaSpot;
  game.characters.hero.position
    .copy(spot)
    .add(new THREE.Vector3(0, 0, kind === "skate" ? 0 : 2.5));
  game.characters.companion.reset(
    game.characters.hero.position,
    place.terrain.blockers,
    place.terrain,
  );
  frames(game);
}
function poses(game) {
  return [game.characters.hero, game.characters.companion.character].map(
    (actor) => {
      const result = [];
      actor.traverse((node) =>
        result.push([...node.position.toArray(), ...node.quaternion.toArray()]),
      );
      return result;
    },
  );
}

test("winter houses fade only for the heroine, including in photo mode", async () => {
  const { game } = await createTestGame();
  game.transitions.open("winter");
  const place = game.places.get("winter"),
    camera = game.rendering.camera;
  const heroine = game.characters.hero,
    companion = game.characters.companion.character;
  const house = place.group.getObjectByName("ochre-red-timber-house");
  const wall = house.children.find((node) => node.isMesh);
  camera.position.set(-25, 3, 20);
  heroine.position.set(-19, 0, 14);
  companion.position.set(-25, 0, 3);
  camera.lookAt(house.position.clone().add(new THREE.Vector3(0, 2, 0)));
  place.afterCamera(1);
  expect(wall.material.opacity).toBe(1);
  heroine.position.set(-25, 0, 3);
  place.afterCamera(1);
  expect(wall.material.opacity).toBeLessThan(0.09);
  heroine.position.set(-19, 0, 14);
  place.afterCamera(1);
  expect(wall.material.opacity).toBe(1);
  expect(game.activities.photography.enter()).toBe(true);
  // Use the photo camera's own settings so its update holds this sightline.
  game.activities.photoMode.settings.yaw = 0;
  game.activities.photoMode.settings.pitch = 8;
  game.activities.photoMode.settings.distance = 12;
  frames(game, 30);
  expect(wall.material.opacity).toBe(1);
  heroine.position.set(-25, 0, 3);
  frames(game, 30);
  expect(wall.material.opacity).toBeLessThan(0.09);
  game.activities.photography.exit();
});

test("a snowball blocking her stays solid while building and photographing, then exploration fading resumes", async () => {
  const { game } = await createTestGame();
  game.transitions.open("winter", { activity: "snowman" });
  const place = game.places.get("winter"),
    hero = game.characters.hero,
    camera = game.rendering.camera;
  frames(game, 100);
  const ball =
    place.world.snowman.getObjectByName("snowman-snowball-0").children[0];
  const center = ball.getWorldPosition(new THREE.Vector3());
  const target = hero.position.clone().setY(center.y);
  const offset = center.clone().sub(target);
  place.getPhotoPreset = () => ({
    lockActors: true,
    target,
    yaw: Math.atan2(offset.x, offset.z),
    pitch: 0,
    distance: 6,
  });
  expect(game.activities.photography.enter()).toBe(true);
  frames(game, 30);
  // Verify this camera actually sees the snowball in front of her.
  ball.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster(
    camera.position,
    target.clone().sub(camera.position).normalize(),
    0,
    camera.position.distanceTo(target),
  );
  expect(ray.intersectObject(ball).length).toBeGreaterThan(0);
  expect(ball.material.opacity).toBe(1);
  expect(ball.material.transparent).toBe(false);
  game.activities.photography.exit();
  frames(game, 5);
  expect(ball.material.opacity).toBe(1);
  place.activity.stop(false);
  place.world.buildSnowman();
  const built = ball.getWorldPosition(new THREE.Vector3());
  hero.position
    .copy(built)
    .add(new THREE.Vector3(0, 0, -3))
    .setY(0);
  place.getPhotoPreset = () => ({
    target: built,
    yaw: 0,
    pitch: 0,
    distance: 6,
  });
  expect(game.activities.photography.enter()).toBe(true);
  frames(game, 30);
  expect(ball.material.opacity).toBeLessThan(0.09);
  game.activities.photography.exit();
});

test("the companion faces his movement after stopping or completing a snowman build", async () => {
  const { game, element } = await createTestGame();
  game.transitions.open("winter");
  const place = game.places.get("winter"),
    character = game.characters.companion.character;
  for (const complete of [false, true]) {
    place.world.resetSnowman();
    approach(game, place, "snowman");
    character.rotation.set(0, 2.7, 0);
    element("#placeAction").onclick();
    if (complete) place.activity.update(SNOWMAN_STEP_SECONDS * 3 + 0.1);
    else {
      frames(game, 20);
      place.activity.stop();
    }
    game.characters.hero.position
      .copy(character.position)
      .add(new THREE.Vector3(7, 0, -2));
    let distance = 0;
    for (let i = 0; i < 35; i++) {
      const before = character.position.clone();
      frames(game);
      const movement = character.position.clone().sub(before);
      distance += movement.length();
      if (movement.lengthSq() > 1e-10) {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
          character.quaternion,
        );
        expect(forward.dot(movement.normalize())).toBeGreaterThan(0.99999);
      }
    }
    expect(distance).toBeGreaterThan(1);
  }
});

test("the northeast winter gate is walkable, unlocks the map and returns with the original camera", async () => {
  const { game, element } = await createTestGame();
  const place = game.places.get("winter"),
    hero = game.characters.hero;
  expect(place.group.visible).toBe(false);
  const view = [game.state.yaw, game.state.pitch, game.state.zoom];
  hero.position.set(23, 0, -21);
  game.input.keys.KeyW = true;
  frames(game, 35);
  game.input.keys.KeyW = false;
  expect(game.state.area).toBe("winter");
  expect(place.group.visible).toBe(true);
  expect(game.worlds.garden.visible).toBe(false);
  expect(game.characters.companion.character.parent).toBe(place.group);
  expect(game.readProgress().discoveredPlaces).toContain("winter");
  expect(element("#throw").hidden).toBe(true);
  expect(game.characters.rig.appearance.state.outfit).toBe("winter");
  expect(game.controls.openMap()).toBe(true);
  const stop = element("#travelDestinations").children.find(
    (entry) => entry.value === "winter",
  );
  expect(stop.attributes["aria-current"]).toBe("location");
  game.travelMap.close();
  hero.position.set(0, 0, 30);
  frames(game, 50);
  expect(game.state.area).toBe("garden");
  expect(hero.position.toArray()).toEqual([23, 0, -20]);
  expect([game.state.yaw, game.state.pitch, game.state.zoom]).toEqual(view);
  expect(place.group.visible).toBe(false);
  expect(game.controls.fastTravel("winter")).toBe(true);
  frames(game, 15);
  expect(game.state.area).toBe("winter");
  // The frozen pond is an activity surface; exploration stays on the bank.
  hero.position.set(17, 0, 5.5);
  game.input.keys.KeyW = true;
  frames(game, 15);
  game.input.keys.KeyW = false;
  expect(place.terrain.contains(hero.position.x, hero.position.z)).toBe(true);
  hero.position.set(0, 0, -38.9);
  game.input.keys.KeyW = true;
  frames(game, 20);
  game.input.keys.KeyW = false;
  expect(Math.hypot(hero.position.x, hero.position.z)).toBeLessThan(40);
  hero.position.set(-12, 0, -6.5);
  game.input.keys.KeyW = true;
  frames(game, 20);
  game.input.keys.KeyW = false;
  expect(
    place.terrain.blockers.every(
      (b) =>
        Math.hypot(hero.position.x - b.x, hero.position.z - b.z) >=
        b.r + 0.38 - 1e-6,
    ),
  ).toBe(true);
});

test("one snowman interaction animates all steps, respects pause and cancellation, and survives revisits", async () => {
  const { game, element, handlers } = await createTestGame();
  game.transitions.open("winter");
  const place = game.places.get("winter");
  approach(game, place, "snowman");
  handlers.get("keydown")(key("KeyX"));
  expect(place.activity.kind).toBe("snowman");
  const initial = poses(game);
  const base = place.world.snowman.getObjectByName("snowman-snowball-0");
  const startingBall = base.position.clone();
  frames(game, 30);
  expect(poses(game)).not.toEqual(initial);
  expect(base.position.equals(startingBall)).toBe(false);
  const elapsed = place.activity.elapsed;
  const flakes = [...place.world.snowflakes.geometry.attributes.position.array];
  element("#guide").open = true;
  frames(game, 150);
  expect(place.activity.elapsed).toBe(elapsed);
  expect([
    ...place.world.snowflakes.geometry.attributes.position.array,
  ]).toEqual(flakes);
  expect(place.world.snowmanStage).toBe(0);
  element("#guide").open = false;
  handlers.get("keydown")(key("KeyX"));
  expect(place.activity.active).toBe(false);
  expect(place.world.snowmanStage).toBe(0);
  frames(game);
  element("#placeAction").onclick();
  const stageFrames = Math.ceil(SNOWMAN_STEP_SECONDS / 0.04);
  for (let stage = 1; stage <= 3; stage++) {
    frames(game, stageFrames);
    expect(place.world.snowmanStage).toBe(stage);
    expect(place.activity.active).toBe(stage < 3);
    if (stage < 3) {
      expect(element("#winterStop").hidden).toBe(false);
      expect(game.controls.openMap()).toBe(false);
    }
  }
  expect(place.activity.memories.has("snowman")).toBe(true);
  game.transitions.jump("garden");
  game.transitions.open("winter");
  expect(place.world.snowmanStage).toBe(3);
  approach(game, place, "snowman");
  element("#winterRebuild").onclick();
  expect(place.world.snowmanStage).toBe(0);
  expect(place.activity.memories.has("snowman")).toBe(true);
});

test("an interrupted build resumes its finished sections and paused photos freeze the moving snowballs", async () => {
  const { game, element } = await createTestGame();
  game.transitions.open("winter");
  const place = game.places.get("winter");
  approach(game, place, "snowman");
  const walking = poses(game);
  element("#placeAction").onclick();
  frames(game, Math.ceil(SNOWMAN_STEP_SECONDS / 0.04) + 25);
  expect(place.world.snowmanStage).toBe(1);
  place.activity.stop(false);
  expect(poses(game)).toEqual(walking);
  expect(
    place.world.snowman.getObjectByName("snowman-snowball-0").visible,
  ).toBe(true);
  expect(
    place.world.snowman.getObjectByName("snowman-snowball-1").visible,
  ).toBe(false);
  expect(place.world.snowman.getObjectByName("snowman-hat").visible).toBe(
    false,
  );
  frames(game);
  expect(element("#placeAction").attributes["aria-label"]).toBe(
    "Continue building snowman · X",
  );
  element("#placeAction").onclick();
  frames(game, 50);
  const ball = place.world.snowman.getObjectByName("snowman-snowball-1");
  const position = ball.position.clone(),
    rotation = ball.quaternion.clone();
  const builders = poses(game);
  expect(game.activities.photography.enter()).toBe(true);
  frames(game, 250);
  expect(ball.position.equals(position)).toBe(true);
  expect(ball.quaternion.equals(rotation)).toBe(true);
  expect(poses(game)).toEqual(builders);
  game.activities.photography.exit();
  frames(game, 300);
  expect(place.world.snowmanStage).toBe(3);
  expect(place.activity.active).toBe(false);
  expect(place.world.snowman.getObjectByName("snowman-hat").visible).toBe(true);
  expect(place.activity.memories.has("snowman")).toBe(true);
  expect(poses(game)).not.toEqual(builders);
  approach(game, place, "snowman");
  element("#winterRebuild").onclick();
  frames(game);
  element("#placeAction").onclick();
  place.activity.update(SNOWMAN_STEP_SECONDS * 3 + 0.1);
  expect(place.world.snowmanStage).toBe(3);
  expect(place.activity.active).toBe(false);
});

test("all winter moments pause for photos, preserve held items and restore walking poses", async () => {
  const { game, element, handlers } = await createTestGame();
  game.transitions.open("winter");
  const place = game.places.get("winter");
  game.characters.rig.items.equip("ice-cream");
  for (const kind of ["snowman", "skate", "cocoa", "sauna"]) {
    approach(game, place, kind);
    const walking = poses(game);
    handlers.get("keydown")(key("KeyX"));
    frames(game, kind === "sauna" ? 12 : 2);
    expect(place.activity.kind).toBe(kind);
    expectSolidScenery(game.rendering.scene, kind);
    expect(game.controls.openMap()).toBe(false);
    expect(game.controls.travelTo("garden")).toBe(false);
    expect(game.activities.photography.enter()).toBe(true);
    expect(game.activities.photoMode.canEditActors).toBe(false);
    const pose = poses(game),
      time = place.activity.elapsed;
    frames(game, 180);
    expect(poses(game)).toEqual(pose);
    expectSolidScenery(game.rendering.scene, `${kind} photo`);
    expect(place.activity.elapsed).toBe(time);
    expect(game.activities.photography.takePhoto()).toBe(true);
    expect(game.activities.photoAlbum.photos[0].location).toContain("Lumeküla");
    game.activities.photography.exit();
    place.activity.stop(false);
    expect(poses(game)).toEqual(walking);
    expect(game.characters.rig.items.current).toBe("ice-cream");
    expect(game.characters.rig.held.visible).toBe(true);
    frames(game);
    expect(element("#winterStop").hidden).toBe(true);
  }
  approach(game, place, "skate");
  element("#placeAction").onclick();
  frames(game, 450);
  expect(place.activity.memories.has("skate")).toBe(true);
  place.activity.stop();
  expect(place.activity.memories.has("cocoa")).toBe(true);
  game.controls.resetAdventure();
  expect(place.activity.memories.size).toBe(0);
});

test("winter resumes the walking checkpoint and restart removes active poses, outfits and progress", async () => {
  const storage = storageInMemory();
  const { game, handlers } = await createTestGame({ storage });
  game.transitions.open("winter");
  const place = game.places.get("winter");
  approach(game, place, "cocoa");
  handlers.get("pagehide")();
  const checkpoint = storage.getItem(LOCATION_SAVE_KEY);
  const walking = game.characters.hero.position.clone();
  game.controls.interact();
  frames(game, 40);
  handlers.get("pagehide")();
  expect(storage.getItem(LOCATION_SAVE_KEY)).toBe(checkpoint);
  const { game: resumed } = await createTestGame({ storage });
  expect(resumed.state.area).toBe("winter");
  expect(resumed.characters.hero.position.equals(walking)).toBe(true);
  expect(resumed.places.get("winter").activity.active).toBe(false);
  resumed.controls.resetAdventure();
  for (const kind of ["cocoa", "snowman", "skate", "sauna"]) {
    resumed.transitions.open("winter", { activity: kind });
    const winter = resumed.places.get("winter");
    frames(resumed, 5);
    expect(winter.activity.kind).toBe(kind);
    resumed.controls.resetAdventure();
    frames(resumed);
    expect(resumed.state.area).toBe("garden");
    expect(winter.group.visible).toBe(false);
    expect(winter.activity.active).toBe(false);
    expect(winter.world.snowmanStage).toBe(0);
    expect(winter.activity.memories.size).toBe(0);
    expect(resumed.characters.rig.appearance.state.outfit).toBe("winter");
    expect(resumed.characters.rig.items.current).toBe("axe");
    expect(resumed.characters.rig.held.visible).toBe(true);
    expect(resumed.readProgress().discoveredPlaces).toEqual(["garden"]);
  }
  resumed.controls.travelTo("winter");
  frames(resumed, 2);
  expect(resumed.passageTransition.active).toBe(true);
  resumed.controls.resetAdventure();
  frames(resumed, 20);
  expect(resumed.state.area).toBe("garden");
  expect(resumed.passageTransition.active).toBe(false);
});
