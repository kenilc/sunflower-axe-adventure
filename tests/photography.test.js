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
  element("#restart").onclick();
  expect(photoAlbum.photos).toHaveLength(1);
  element("#guide").open = true;
  expect(photography.enter()).toBe(false);
});

test("camera mode is available in other destinations and cannot interrupt an activity", async () => {
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
  expect(photography.enter()).toBe(false);
  expect(photography.openAlbum()).toBe(false);
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
