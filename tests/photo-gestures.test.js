import { afterEach, beforeEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createPhotoMode } from "../src/rendering/photo-mode.js";
import { bindPhotoGestures } from "../src/rendering/photo-gestures.js";
import { createPhotoView } from "../src/rendering/photo-view.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function fixture() {
  const actors = [-2, 2].map((x) => {
    const group = new THREE.Group();
    group.position.x = x;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshBasicMaterial(),
    );
    body.position.y = 1;
    group.add(body);
    return group;
  });
  const camera = new THREE.PerspectiveCamera(43, 4 / 3);
  camera.position.set(0, 4, 12);
  camera.lookAt(0, 1, 0);
  const mode = createPhotoMode({
    camera,
    actors,
    getPlace: () => ({
      terrain: {
        blockers: [],
        contains: (x, z) => Math.abs(x) < 10 && Math.abs(z) < 10,
        heightAt: () => 0,
      },
    }),
  });
  mode.enter();
  const rect = { left: 100, top: 50, width: 800, height: 600 };
  const screen = (index) => {
    const point = actors[index].position
      .clone()
      .add(new THREE.Vector3(0, 1, 0))
      .project(camera);
    return {
      x: rect.left + ((point.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - point.y) * rect.height) / 2,
    };
  };
  const listeners = new Map(),
    captures = new Set();
  const canvas = {
    getBoundingClientRect: () => rect,
    addEventListener: (name, callback) => listeners.set(name, callback),
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
  };
  vi.stubGlobal("addEventListener", vi.fn());
  const changed = vi.fn(),
    vibrate = vi.fn();
  vi.stubGlobal("navigator", { vibrate });
  let paused = false;
  const gestures = bindPhotoGestures(canvas, {
    mode,
    paused: () => paused,
    changed,
  });
  const event = (
    type,
    { id = 1, x = 120, y = 70, deltaY = 0, shiftKey = false } = {},
  ) =>
    listeners.get(type)({
      pointerId: id,
      clientX: x,
      clientY: y,
      button: 0,
      shiftKey,
      pointerType: "touch",
      deltaY,
      preventDefault: vi.fn(),
    });
  return {
    actors,
    camera,
    mode,
    screen,
    event,
    gestures,
    captures,
    changed,
    vibrate,
    pause: () => {
      paused = true;
    },
  };
}

test("tapping and dragging either character turns only that character; dragging scenery orbits", () => {
  const { actors, mode, screen, event } = fixture();
  const initialYaw = mode.settings.yaw;
  for (const index of [0, 1]) {
    const point = screen(index);
    event("pointerdown", point);
    expect(mode.selectedActor).toBe(index);
    event("pointermove", { x: point.x + 50, y: point.y });
    event("pointerup", point);
    expect(actors[index].rotation.y).toBeCloseTo(0.6);
    expect(mode.settings.yaw).toBe(initialYaw);
  }
  expect(mode.selectionBounds().width).toBeGreaterThan(0);
  event("pointerdown");
  expect(mode.selectedActor).toBe(null);
  event("pointermove", { x: 170, y: 90 });
  event("pointerup");
  expect(mode.settings.yaw).not.toBe(initialYaw);
  expect(actors[0].rotation.y).toBeCloseTo(0.6);
});

test("holding a character enables movement and gives feedback without turning them", () => {
  const { actors, mode, screen, event, changed, vibrate } = fixture();
  const point = screen(0),
    origin = actors[0].position.clone();
  event("pointerdown", point);
  vi.advanceTimersByTime(449);
  expect(vibrate).not.toHaveBeenCalled();
  // A little finger jitter should not prevent a deliberate hold.
  event("pointermove", { x: point.x + 2, y: point.y });
  vi.advanceTimersByTime(1);
  expect(changed).toHaveBeenLastCalledWith({ moving: true });
  expect(vibrate).toHaveBeenCalledWith(12);
  event("pointermove", { x: point.x + 40, y: point.y });
  event("pointerup", point);
  expect(actors[0].position.x).toBeGreaterThan(origin.x);
  expect(actors[0].position.y).toBe(0);
  expect(actors[0].rotation.y).toBe(0);
  expect(actors[1].position.x).toBe(2);
  event("pointerdown");
  expect(mode.selectedActor).toBe(null);
  expect(changed).toHaveBeenLastCalledWith({ moving: false });
});

test("pinch zooms and frames without turning a character or jumping when one finger lifts", () => {
  const { mode, event, actors } = fixture();
  const distance = mode.settings.distance;
  event("pointerdown", { id: 1, x: 150, y: 150 });
  event("pointerdown", { id: 2, x: 250, y: 150 });
  event("pointermove", { id: 2, x: 350, y: 150 });
  expect(mode.settings.distance).toBeCloseTo(distance / 2);
  expect(mode.settings.horizontal).not.toBe(0);
  const yaw = mode.settings.yaw;
  event("pointerup", { id: 2 });
  event("pointermove", { id: 1, x: 190, y: 180 });
  expect(mode.settings.yaw).toBe(yaw);
  expect(actors[0].rotation.y).toBe(0);
  event("pointerup", { id: 1 });
  event("pointerdown");
  event("pointermove", { x: 200, y: 90 });
  expect(mode.settings.yaw).not.toBe(yaw);
});

test("cancel, pause and exit release captures and reject further photo gestures", () => {
  const { event, mode, pause, captures } = fixture();
  event("pointerdown");
  event("pointercancel");
  expect(captures.size).toBe(0);
  event("pointerdown");
  const distance = mode.settings.distance,
    yaw = mode.settings.yaw;
  pause();
  event("pointermove", { x: 200 });
  event("wheel", { deltaY: 100 });
  expect(captures.size).toBe(0);
  expect(mode.settings.yaw).toBe(yaw);
  expect(mode.settings.distance).toBe(distance);
  mode.exit();
  event("pointerdown");
  expect(captures.size).toBe(0);
});

test("viewfinder and canvas share portrait bounds on phones and restore the full exploration view", () => {
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  const camera = new THREE.PerspectiveCamera();
  const renderer = { domElement: { style: {} }, setSize: vi.fn() },
    frame = { style: {} };
  const view = createPhotoView({ renderer, camera, frame });
  view.resize(true);
  const [width, height] = renderer.setSize.mock.calls.at(-1);
  expect(width / height).toBeCloseTo(3 / 4);
  expect(width).toBeLessThan(390);
  expect(camera.aspect).toBe(3 / 4);
  expect(renderer.domElement.style).toEqual(frame.style);
  vi.stubGlobal("innerHeight", 600);
  view.resize(true);
  expect(
    parseFloat(frame.style.top) + parseFloat(frame.style.height),
  ).toBeLessThanOrEqual(600 - 156);
  vi.stubGlobal("innerWidth", 844);
  vi.stubGlobal("innerHeight", 390);
  view.resize(true);
  expect(camera.aspect).toBe(4 / 3);
  expect(
    parseFloat(frame.style.top) + parseFloat(frame.style.height),
  ).toBeLessThan(390);
  view.resize(false);
  expect(camera.aspect).toBe(844 / 390);
  expect(renderer.domElement.style.position).toBe("");
  expect(renderer.setSize).toHaveBeenLastCalledWith(844, 390);
});

test("a drag starts turning immediately and never changes into a move mid-gesture", () => {
  const { actors, screen, event, vibrate } = fixture();
  const point = screen(0),
    origin = actors[0].position.clone();
  event("pointerdown", point);
  event("pointermove", { x: point.x + 30, y: point.y });
  vi.advanceTimersByTime(1000);
  event("pointermove", { x: point.x + 60, y: point.y });
  expect(actors[0].rotation.y).toBeCloseTo(0.72);
  expect(actors[0].position.equals(origin)).toBe(true);
  expect(vibrate).not.toHaveBeenCalled();
});

test("releasing, cancelling, resetting, pinching, pausing or exiting cancels a pending hold", () => {
  for (const reason of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "reset",
    "pinch",
    "pause",
    "exit",
  ]) {
    const { mode, screen, event, gestures, pause, vibrate } = fixture();
    event("pointerdown", screen(0));
    if (reason === "reset") gestures.reset();
    else if (reason === "pinch")
      event("pointerdown", { id: 2, x: 600, y: 150 });
    else if (reason === "pause") pause();
    else if (reason === "exit") mode.exit();
    else event(reason);
    vi.advanceTimersByTime(1000);
    expect(vibrate, reason).not.toHaveBeenCalled();
    gestures.reset();
  }
});

test("Shift drag provides mouse movement and framing without visible mode switches", () => {
  const { actors, mode, screen, event } = fixture();
  const point = screen(0),
    origin = actors[0].position.clone();
  event("pointerdown", { ...point, shiftKey: true });
  event("pointermove", { x: point.x + 40, y: point.y });
  event("pointerup");
  expect(actors[0].position.x).toBeGreaterThan(origin.x);
  expect(actors[0].rotation.y).toBe(0);
  event("pointerdown", { shiftKey: true });
  const yaw = mode.settings.yaw;
  event("pointermove", { x: 180, y: 100 });
  expect(mode.settings.horizontal).not.toBe(0);
  expect(mode.settings.yaw).toBe(yaw);
});

test("holding still moves a character when a low camera angle misses the ground plane", () => {
  const { mode, actors, screen, event } = fixture();
  mode.settings.pitch = -5;
  mode.updateCamera();
  const point = screen(0),
    origin = actors[0].position.clone();
  event("pointerdown", point);
  vi.advanceTimersByTime(450);
  event("pointermove", { x: point.x + 40, y: point.y });
  expect(actors[0].position.x).toBeGreaterThan(origin.x);
  expect(actors[0].rotation.y).toBe(0);
});
