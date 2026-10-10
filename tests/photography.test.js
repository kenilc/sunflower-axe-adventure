import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import {
  createPhotoAlbum,
  PHOTO_ALBUM_KEY,
  PHOTO_LIMIT,
} from "../src/systems/photo-album.js";
import { createPhotoMode } from "../src/rendering/photo-mode.js";
import { createTestGame } from "./helpers/game.js";

afterEach(() => vi.unstubAllGlobals());
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
const image = "data:image/jpeg;base64,cGhvdG8=";

test("album persists across instances and preserves saved photos when quota is exceeded", () => {
  const storage = memoryStorage();
  const album = createPhotoAlbum({ storage: () => storage });
  const first = album.add(image, "Garden");
  expect(createPhotoAlbum({ storage: () => storage }).photos[0]).toEqual(first);
  const saved = storage.getItem(PHOTO_ALBUM_KEY);
  storage.setItem = () => {
    throw new Error("quota exceeded");
  };
  expect(() => album.add(image, "Cave")).toThrow();
  expect(() => album.remove(first.id)).toThrow();
  expect(album.photos).toEqual([first]);
  expect(storage.getItem(PHOTO_ALBUM_KEY)).toBe(saved);
});

test("album deletes persist, full albums do not evict photos, and invalid or blocked storage is handled", () => {
  const storage = memoryStorage();
  const album = createPhotoAlbum({ storage: () => storage });
  for (let i = 0; i < PHOTO_LIMIT; i++) album.add(image, `Place ${i}`);
  const oldest = album.photos.at(-1);
  expect(() => album.add(image, "Extra")).toThrow("album-full");
  expect(album.photos.at(-1)).toEqual(oldest);
  album.remove(oldest.id);
  expect(createPhotoAlbum({ storage: () => storage }).photos).toHaveLength(
    PHOTO_LIMIT - 1,
  );
  storage.setItem(PHOTO_ALBUM_KEY, "invalid json");
  expect(createPhotoAlbum({ storage: () => storage }).loadError).toBe(true);
  storage.setItem(
    PHOTO_ALBUM_KEY,
    JSON.stringify([
      { ...oldest, image: "https://untrusted.example/photo" },
      oldest,
    ]),
  );
  expect(createPhotoAlbum({ storage: () => storage }).photos).toEqual([oldest]);
  const blocked = createPhotoAlbum({
    storage: () => {
      throw new Error("storage blocked");
    },
  });
  expect(blocked.loadError).toBe(true);
  expect(() => blocked.add(image, "Garden")).toThrow();
});

test("camera mode edits both actors independently, obeys terrain, and restores entry transforms", () => {
  const actors = [new THREE.Group(), new THREE.Group()];
  actors[1].position.set(2, 0, 0);
  const camera = new THREE.PerspectiveCamera(43, 16 / 9);
  camera.position.set(0, 5, 12);
  camera.lookAt(0, 1, 0);
  const position = camera.position.clone(),
    quaternion = camera.quaternion.clone();
  const mode = createPhotoMode({
    camera,
    actors,
    getPlace: () => ({
      terrain: {
        blockers: [],
        contains: (x, z) => Math.abs(x) < 4 && Math.abs(z) < 4,
        heightAt: (x) => x * 0.1,
      },
    }),
  });
  mode.enter();
  mode.adjustActor(0, { x: 1, z: 2, heading: 90 });
  mode.adjustActor(1, { x: -1, z: -1, heading: -45 });
  expect(actors[0].position.toArray()).toEqual([1, 0.1, 2]);
  expect(actors[1].position.toArray()).toEqual([1, 0.1, -1]);
  expect(actors[0].rotation.y).toBeCloseTo(Math.PI / 2);
  mode.adjustActor(0, { x: 5 });
  expect(actors[0].position.toArray()).toEqual([1, 0.1, 2]);
  mode.rotate(50, -10000);
  mode.zoomBy(-10000);
  expect(mode.settings.pitch).toBe(-5);
  expect(mode.settings.distance).toBe(3);
  mode.exit();
  expect(actors[0].position.toArray()).toEqual([0, 0, 0]);
  expect(actors[1].position.toArray()).toEqual([2, 0, 0]);
  expect(actors[0].rotation.y).toBe(0);
  expect(camera.position.equals(position)).toBe(true);
  expect(camera.quaternion.equals(quaternion)).toBe(true);
});

test("camera and album pause gameplay, capture current framing, survive restart, and route keyboard safely", async () => {
  const storage = memoryStorage();
  const { game, element, handlers } = await createTestGame({ storage });
  const { photoMode, photoAlbum, photography } = game.activities;
  const hero = game.characters.hero,
    companion = game.characters.companion.character;
  const origin = hero.position.clone(),
    companionOrigin = companion.position.clone();
  const tick = () => {
    game.rendering.clock.getDelta = () => 0.04;
    game.update();
  };
  expect(photography.enter()).toBe(true);
  photoMode.adjustActor(0, { x: 2 });
  photoMode.adjustActor(1, { z: 1, heading: 180 });
  const arranged = hero.position.clone(),
    arrangedCompanion = companion.position.clone();
  game.input.keys.KeyW = true;
  game.controls.fire();
  tick();
  expect(hero.position.equals(arranged)).toBe(true);
  expect(companion.position.equals(arrangedCompanion)).toBe(true);
  expect(game.effects.axes).toHaveLength(0);
  const key = (code, target = {}) =>
    handlers.get("keydown")({
      code,
      repeat: false,
      preventDefault: vi.fn(),
      target,
    });
  key("Space", { tagName: "INPUT" });
  expect(photoAlbum.photos).toHaveLength(0);
  key("Enter");
  expect(photoAlbum.photos).toHaveLength(1);
  // Resizing to a phone gives the preview a matching portrait camera crop.
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  handlers.get("resize")();
  expect(game.rendering.camera.aspect).toBe(3 / 4);
  expect(photography.takePhoto()).toBe(true);
  expect(photoAlbum.photos).toHaveLength(2);
  expect(photography.openAlbum()).toBe(true);
  tick();
  expect(hero.position.equals(arranged)).toBe(true);
  photography.closeAlbum();
  expect(photoMode.active).toBe(true);
  key("Escape");
  expect(photoMode.active).toBe(false);
  expect(hero.position.equals(origin)).toBe(true);
  expect(companion.position.equals(companionOrigin)).toBe(true);
  expect(game.input.keys.KeyW).toBe(false);
  expect(photography.openAlbum()).toBe(true);
  game.input.keys.KeyD = true;
  tick();
  expect(hero.position.equals(origin)).toBe(true);
  element("#deletePhoto").onclick();
  expect(photoAlbum.photos).toHaveLength(1);
  photography.closeAlbum();
  expect(createPhotoAlbum({ storage: () => storage }).photos).toHaveLength(1);
  game.controls.resetAdventure();
  expect(photoAlbum.photos).toHaveLength(1);
  element("#guide").open = true;
  expect(photography.enter()).toBe(false);
});

test("camera mode is available in other destinations and during ring toss", async () => {
  const { game } = await createTestGame();
  const { photography, photoMode } = game.activities;
  const tick = () => {
    game.rendering.clock.getDelta = () => 0.04;
    game.update();
  };
  for (const area of ["cave", "riverside", "funfair", "festival", "village"]) {
    game.transitions.open(area);
    for (let i = 0; i < 30; i++) tick();
    const position = game.characters.hero.position.clone();
    expect(photography.enter(), area).toBe(true);
    photoMode.adjustActor(0, { x: 0.5, heading: 45 });
    tick();
    photography.exit();
    expect(game.characters.hero.position.equals(position), area).toBe(true);
  }
  game.transitions.open("funfair", { activity: "ring-toss" });
  expect(photography.enter()).toBe(true);
  expect(photoMode.canEditActors).toBe(false);
  expect(photography.openAlbum()).toBe(true);
});

test("sound=off keeps the debugging preview silent at startup", async () => {
  vi.stubGlobal("location", { search: "?sound=off" });
  const { element } = await createTestGame();
  expect(element("#soundLabel").textContent).toBe("Sound off");
  expect(element("#sound").title).toBe("Sound off · Click to unmute");
});

test("keyboard shortcuts move, frame, zoom and reset without camera mode switches", async () => {
  const { game, handlers } = await createTestGame();
  const { photography, photoMode } = game.activities;
  photography.enter();
  const hero = game.characters.hero,
    origin = hero.position.clone();
  const key = (code, shiftKey = false) =>
    handlers.get("keydown")({
      code,
      shiftKey,
      repeat: false,
      target: {},
      preventDefault: vi.fn(),
    });
  key("Digit1");
  key("ArrowRight");
  expect(hero.rotation.y).not.toBe(0);
  key("ArrowRight", true);
  expect(hero.position.x).toBeGreaterThan(origin.x);
  key("Digit0");
  const yaw = photoMode.settings.yaw;
  key("ArrowRight");
  expect(photoMode.settings.yaw).not.toBe(yaw);
  key("ArrowUp", true);
  expect(photoMode.settings.vertical).not.toBe(0);
  const distance = photoMode.settings.distance;
  key("Equal");
  expect(photoMode.settings.distance).toBeLessThan(distance);
  key("Minus");
  expect(photoMode.settings.distance).toBeCloseTo(distance);
  key("KeyR");
  expect(photoMode.active).toBe(true);
  expect(hero.position.equals(origin)).toBe(true);
  expect(hero.rotation.y).toBe(0);
  expect(photoMode.settings.vertical).toBe(0);
});

test("activity photos pause every ride and pose, save captions, and resume the original view", async () => {
  const storage = memoryStorage();
  const { game, element, handlers } = await createTestGame({ storage });
  const { hero, rig, companion } = game.characters;
  const {
    photography,
    photoMode,
    photoAlbum,
    bedRest,
    boatTrip,
    cableCar,
    funfairActivities,
    alpineCart,
    sheepMoment,
    festivalMoment,
  } = game.activities;
  const { camera, renderer } = game.rendering;
  const frames = (count = 25) => {
    game.rendering.clock.getDelta = () => 0.04;
    for (let i = 0; i < count; i++) game.update();
  };
  const key = (code) =>
    handlers.get("keydown")({
      code,
      repeat: false,
      target: {},
      preventDefault: vi.fn(),
    });
  const transforms = (objects) =>
    objects.map((object) => {
      const result = [];
      object.traverse((node) =>
        result.push([
          ...node.position.toArray(),
          ...node.quaternion.toArray(),
          ...node.scale.toArray(),
        ]),
      );
      return result;
    });
  const cases = [
    {
      name: "Lakeside hug",
      setup() {
        hero.position.copy(game.worlds.lakeside.bench.position);
        game.update();
        element("#benchAction").onclick();
      },
      returnId: "benchStand",
    },
    {
      name: "Resting together",
      setup() {
        game.transitions.restore("castle");
        bedRest.start();
      },
      active: () => bedRest.resting,
      returnId: "castleAction",
    },
    {
      name: "Rowing together",
      setup() {
        game.transitions.open("riverside");
        frames();
        hero.position.copy(boatTrip.riverDock);
        game.controls.boardBoat();
      },
      active: () => boatTrip.rowing,
      objects: () => [boatTrip.boat],
    },
    {
      name: "Cable car for two",
      setup() {
        game.transitions.restore("lagoon");
        frames();
        hero.position.copy(cableCar.islandDock);
        game.controls.boardCableCar();
      },
      active: () => cableCar.riding,
      objects: () => [cableCar.group],
    },
    ...["ferris", "carousel"].map((ride) => ({
      name: ride === "ferris" ? "Ferris wheel" : "Woodland carousel",
      setup() {
        game.transitions.open("funfair");
        frames();
        hero.position.copy(
          game.worlds.funfair[
            ride === "ferris" ? "ferrisBoard" : "carouselBoard"
          ],
        );
        game.controls.interactFunfair();
      },
      active: () => funfairActivities.riding,
      objects: () =>
        ride === "ferris"
          ? game.worlds.funfair.cabins
          : game.worlds.funfair.mounts.map((m) => m.mount),
      returnId: "funfairAction",
    })),
    {
      name: "Ring toss",
      setup() {
        game.transitions.open("funfair", { activity: "ring-toss" });
        frames();
      },
      active: () => funfairActivities.playing,
      objects: () => [game.worlds.funfair.ring],
      returnId: "funfairExit",
    },
    {
      name: "Alpine cart",
      setup() {
        game.transitions.open("village", { activity: "lookout" });
        frames();
        game.controls.interactVillage();
      },
      active: () => alpineCart.riding,
      objects: () => [alpineCart.cart],
    },
    {
      name: "Sheep meadow",
      setup() {
        game.transitions.open("village", { activity: "sheep" });
        frames();
        game.controls.interactVillage();
      },
      active: () => sheepMoment.active,
      objects: () => game.worlds.village.sheep.map((sheep) => sheep.group),
    },
    {
      name: "Fireworks for two",
      setup() {
        game.transitions.open("festival", { activity: "fireworks" });
      },
      active: () => festivalMoment.active,
      returnId: "festivalAction",
    },
    {
      name: "Via Ferrata",
      setup() {
        game.transitions.open("village", { activity: "trail" });
      },
    },
  ];
  for (const activity of cases) {
    game.controls.resetAdventure();
    activity.setup();
    frames();
    if (activity.active) expect(activity.active(), activity.name).toBe(true);
    if (activity.returnId) {
      const button = element(`#${activity.returnId}`);
      expect(button.hidden, activity.name).toBe(false);
      expect(button.innerHTML).toContain("#returnIcon");
      expect(button.attributes["aria-label"]).toBeTruthy();
    }
    handlers.get("pagehide")();
    const checkpoint = storage.getItem("sunflower-location-v1");
    const objects = [
      hero,
      companion.character,
      ...(activity.objects?.() ?? []),
    ];
    const pose = transforms(objects);
    const original = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      fov: camera.fov,
    };
    const aim = funfairActivities.aim,
      progress = alpineCart.progress,
      elapsed = sheepMoment.elapsed;
    // The same toolbar camera and keyboard shortcut serve every activity.
    element("#cameraAction").onclick();
    expect(photoMode.active, activity.name).toBe(true);
    expect(photoMode.canEditActors, activity.name).toBe(false);
    photoMode.adjustActor(0, { x: 3, heading: 90 });
    key("Digit2");
    key("ArrowRight");
    key("Equal");
    expect(photoMode.selectedActor).toBeNull();
    const photographedView = camera.position.clone();
    frames(240);
    expect(transforms(objects), activity.name).toEqual(pose);
    expect(camera.position.equals(photographedView)).toBe(true);
    expect(funfairActivities.aim).toBe(aim);
    expect(alpineCart.progress).toBe(progress);
    expect(sheepMoment.elapsed).toBe(elapsed);
    if (activity.active) expect(activity.active(), activity.name).toBe(true);
    // Photo mode must render the scene it captures, including at the booth.
    expect(renderer.scene).toBe(game.rendering.scene);
    expect(renderer.camera).toBe(camera);
    expect(photography.takePhoto(), activity.name).toBe(true);
    expect(photoAlbum.photos[0].location).toContain(activity.name);
    expect(createPhotoAlbum({ storage: () => storage }).photos[0]).toEqual(
      photoAlbum.photos[0],
    );
    photography.openAlbum();
    frames(15);
    photography.closeAlbum();
    expect(transforms(objects)).toEqual(pose);
    handlers.get("pagehide")();
    expect(storage.getItem("sunflower-location-v1")).toBe(checkpoint);
    key("KeyM");
    expect(photoMode.active).toBe(false);
    expect(camera.position.equals(original.position)).toBe(true);
    expect(camera.quaternion.equals(original.quaternion)).toBe(true);
    expect(camera.fov).toBe(original.fov);
    if (activity.name === "Via Ferrata") game.input.keys.KeyW = true;
    frames(5);
    if (activity.name !== "Ring toss")
      expect(transforms(objects), `${activity.name} resumes`).not.toEqual(pose);
    if (activity.name === "Ring toss") {
      expect(renderer.scene).toBe(game.worlds.funfair.tossScene);
      expect(renderer.camera).toBe(game.worlds.funfair.tossCamera);
      expect(funfairActivities.aim).not.toBe(aim);
      // A ring already in flight also pauses and finishes after returning.
      game.controls.interactFunfair();
      frames(4);
      expect(funfairActivities.throwing).toBe(true);
      const flying = transforms([game.worlds.funfair.ring]);
      element("#cameraAction").onclick();
      frames(80);
      expect(transforms([game.worlds.funfair.ring])).toEqual(flying);
      expect(funfairActivities.throwing).toBe(true);
      photography.exit();
      frames(30);
      expect(funfairActivities.throwing).toBe(false);
      element("#funfairExit").onclick();
      frames(1);
      expect(funfairActivities.playing).toBe(false);
      expect(element("#funfairAction").innerHTML).not.toContain("#returnIcon");
    }
  }
  expect(photoAlbum.photos).toHaveLength(cases.length);
  expect(element("#restart").onclick).toBeUndefined();
  expect(rig.items.current).toBe("axe");
});
