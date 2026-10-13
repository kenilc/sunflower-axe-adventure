import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import {
  createPhotoAlbum,
  PHOTO_ALBUM_KEY,
  PHOTO_LIMIT,
} from "../src/systems/photo-album.js";
import { crc32 } from "../src/systems/zip.js";
import { createPhotoMode } from "../src/rendering/photo-mode.js";
import { albumFor, createTestGame, settle } from "./helpers/game.js";
import { expectSolidScenery } from "./helpers/scenery.js";

afterEach(() => vi.unstubAllGlobals());
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
const image = "data:image/jpeg;base64,cGhvdG8=";
function openAlbum(database, storage = memoryStorage()) {
  const album = createPhotoAlbum({
    storage: () => storage,
    database: () => database,
  });
  return album.ready.then(() => album);
}
const blockedDatabase = {
  open() {
    throw new Error("storage blocked");
  },
};
// Reads a stored (uncompressed) zip back into { name, bytes, crc } entries.
function readZip(zip) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const entries = [];
  let at = view.getUint32(end + 16, true);
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(at + 28, true),
      size = view.getUint32(at + 24, true),
      local = view.getUint32(at + 42, true);
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const data = local + 30 + view.getUint16(local + 26, true);
    entries.push({
      name: new TextDecoder().decode(
        zip.subarray(at + 46, at + 46 + nameLength),
      ),
      bytes: zip.slice(data, data + size),
      crc: view.getUint32(at + 16, true),
    });
    at += 46 + nameLength;
  }
  return entries;
}

test("album persists across instances and preserves saved photos when a write fails", async () => {
  const database = new IDBFactory();
  const album = await openAlbum(database);
  const first = await album.add(image, "Garden");
  expect((await openAlbum(database)).photos).toEqual([first]);
  const quota = () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  };
  const add = vi
      .spyOn(IDBObjectStore.prototype, "add")
      .mockImplementation(quota),
    remove = vi
      .spyOn(IDBObjectStore.prototype, "delete")
      .mockImplementation(quota);
  await expect(album.add(image, "Cave")).rejects.toThrow();
  await expect(album.remove(first.id)).rejects.toThrow();
  add.mockRestore();
  remove.mockRestore();
  expect(album.photos).toEqual([first]);
  expect((await openAlbum(database)).photos).toEqual([first]);
});

test("album deletes persist, full albums do not evict photos, and blocked storage is handled", async () => {
  const database = new IDBFactory();
  const album = await openAlbum(database);
  // Quick shutter presses are queued, so only the one past the limit fails.
  const results = await Promise.allSettled(
    Array.from({ length: PHOTO_LIMIT + 1 }, (_, i) =>
      album.add(image, `Place ${i}`),
    ),
  );
  expect(
    results.filter((r) => r.status === "rejected").map((r) => r.reason.message),
  ).toEqual(["album-full"]);
  const oldest = album.photos.at(-1);
  expect(oldest.location).toBe("Place 0");
  await album.remove(oldest.id);
  expect((await openAlbum(database)).photos).toHaveLength(PHOTO_LIMIT - 1);
  const blocked = await openAlbum(blockedDatabase);
  expect(blocked.loadError).toBe(true);
  await expect(blocked.add(image, "Garden")).rejects.toThrow(
    "album-unavailable",
  );
});

test("photos saved in localStorage move into IndexedDB once, and the old copy is removed only after the move", async () => {
  const storage = memoryStorage();
  const legacy = [
    {
      id: "b",
      image,
      location: "Cave",
      createdAt: "2026-05-02T10:00:00.000Z",
    },
    {
      id: "a",
      image: "data:image/png;base64,d29vbGx5",
      location: "Garden",
      createdAt: "2026-05-01T10:00:00.000Z",
    },
  ];
  storage.setItem(
    PHOTO_ALBUM_KEY,
    JSON.stringify([
      ...legacy,
      { ...legacy[0], id: "x", image: "https://untrusted.example/photo" },
    ]),
  );
  // Without IndexedDB the old photos stay put and can still be viewed.
  const unavailable = await openAlbum(blockedDatabase, storage);
  expect(unavailable.loadError).toBe(true);
  expect(unavailable.photos).toEqual(legacy);
  expect(storage.getItem(PHOTO_ALBUM_KEY)).not.toBeNull();
  const database = new IDBFactory();
  const album = await openAlbum(database, storage);
  expect(album.loadError).toBe(false);
  expect(album.photos).toEqual(legacy);
  expect(storage.getItem(PHOTO_ALBUM_KEY)).toBeNull();
  await album.remove("a");
  // Even if the old copy could not be removed, a deleted photo stays deleted.
  storage.setItem(PHOTO_ALBUM_KEY, JSON.stringify(legacy));
  expect((await openAlbum(database, storage)).photos).toEqual([legacy[0]]);
  expect(storage.getItem(PHOTO_ALBUM_KEY)).toBeNull();
  // An unreadable old album is left alone rather than lost.
  storage.setItem(PHOTO_ALBUM_KEY, "invalid json");
  expect((await openAlbum(database, storage)).loadError).toBe(false);
  expect(storage.getItem(PHOTO_ALBUM_KEY)).toBe("invalid json");
});

test("Download all saves every photo into one zip with unique names", async () => {
  const storage = memoryStorage();
  const photos = [
    { id: "c", image, location: "Cave", createdAt: "2026-05-03T10:00:00.000Z" },
    {
      id: "b",
      image: "data:image/jpeg;base64,c2Vjb25k",
      location: "Cave",
      createdAt: "2026-05-03T10:00:00.000Z",
    },
    {
      id: "a",
      image: "data:image/png;base64,d29vbGx5",
      location: "Garden",
      createdAt: "2026-05-01T10:00:00.000Z",
    },
  ];
  storage.setItem(PHOTO_ALBUM_KEY, JSON.stringify(photos));
  const { game, element } = await createTestGame({ storage });
  const { photography } = game.activities;
  const createObjectURL = vi
    .spyOn(URL, "createObjectURL")
    .mockReturnValue("blob:album");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const click = vi.fn();
  let link;
  const createElement = document.createElement;
  vi.spyOn(document, "createElement").mockImplementation((tag) => {
    const created = createElement(tag);
    if (tag === "a") Object.assign(created, { click }) && (link = created);
    return created;
  });
  expect(photography.openAlbum()).toBe(true);
  expect(element("#downloadAllPhotos").hidden).toBe(false);
  element("#downloadAllPhotos").onclick();
  expect(click).toHaveBeenCalledTimes(1);
  expect(link.href).toBe("blob:album");
  expect(link.download).toMatch(/^sunflower-photos-\d{4}-\d{2}-\d{2}\.zip$/);
  const blob = createObjectURL.mock.calls[0][0];
  expect(blob.type).toBe("application/zip");
  const entries = readZip(new Uint8Array(await blob.arrayBuffer()));
  expect(entries.map((entry) => entry.name)).toEqual([
    "sunflower-2026-05-03T10-00-00-000Z.jpg",
    "sunflower-2026-05-03T10-00-00-000Z-2.jpg",
    "sunflower-2026-05-01T10-00-00-000Z.png",
  ]);
  expect(entries.map((entry) => new TextDecoder().decode(entry.bytes))).toEqual(
    ["second", "photo", "woolly"],
  );
  for (const entry of entries) expect(entry.crc).toBe(crc32(entry.bytes));
  photography.closeAlbum();
  for (const photo of photos) await game.activities.photoAlbum.remove(photo.id);
  photography.openAlbum();
  expect(element("#downloadAllPhotos").hidden).toBe(true);
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
  await settle(game);
  expect(photoAlbum.photos).toHaveLength(1);
  // Resizing to a phone gives the preview a matching portrait camera crop.
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  handlers.get("resize")();
  expect(game.rendering.camera.aspect).toBe(3 / 4);
  expect(await photography.takePhoto()).toBe(true);
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
  // Closing a dialog leaves focus on its HUD button; M must still toggle.
  key("KeyM", { tagName: "BUTTON" });
  expect(photoMode.active).toBe(true);
  key("KeyM", { tagName: "INPUT" });
  expect(photoMode.active).toBe(true);
  key("KeyM", { tagName: "BUTTON" });
  expect(photoMode.active).toBe(false);
  expect(photography.openAlbum()).toBe(true);
  game.input.keys.KeyD = true;
  tick();
  expect(hero.position.equals(origin)).toBe(true);
  await element("#deletePhoto").onclick();
  expect(photoAlbum.photos).toHaveLength(1);
  photography.closeAlbum();
  expect((await albumFor(storage)).photos).toHaveLength(1);
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
    expectSolidScenery(game.rendering.scene, activity.name);
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
    expectSolidScenery(game.rendering.scene, `${activity.name} photo`);
    expect(camera.position.equals(photographedView)).toBe(true);
    expect(funfairActivities.aim).toBe(aim);
    expect(alpineCart.progress).toBe(progress);
    expect(sheepMoment.elapsed).toBe(elapsed);
    if (activity.active) expect(activity.active(), activity.name).toBe(true);
    // Photo mode must render the scene it captures, including at the booth.
    expect(renderer.scene).toBe(game.rendering.scene);
    expect(renderer.camera).toBe(camera);
    expect(await photography.takePhoto(), activity.name).toBe(true);
    expect(photoAlbum.photos[0].location).toContain(activity.name);
    expect((await albumFor(storage)).photos[0]).toEqual(photoAlbum.photos[0]);
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
