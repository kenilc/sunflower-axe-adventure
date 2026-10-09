import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createPhotoMode } from "../src/rendering/photo-mode.js";
import { bindPhotoGestures } from "../src/rendering/photo-gestures.js";
import { createPhotoView } from "../src/rendering/photo-view.js";

afterEach(() => vi.unstubAllGlobals());
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
  let paused = false;
  const gestures = bindPhotoGestures(canvas, {
    mode,
    paused: () => paused,
    changed: vi.fn(),
  });
  const event = (type, { id = 1, x = 120, y = 70, deltaY = 0 } = {}) =>
    listeners.get(type)({
      pointerId: id,
      clientX: x,
      clientY: y,
      button: 0,
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

test("Move drags a character along terrain without changing their heading", () => {
  const { actors, mode, screen, event } = fixture();
  mode.selectActor(0);
  mode.setManipulation("move");
  const point = screen(0),
    origin = actors[0].position.clone();
  event("pointerdown", point);
  event("pointermove", { x: point.x + 40, y: point.y });
  event("pointerup", point);
  expect(actors[0].position.x).toBeGreaterThan(origin.x);
  expect(actors[0].position.y).toBe(0);
  expect(actors[0].rotation.y).toBe(0);
  expect(actors[1].position.x).toBe(2);
  event("pointerdown");
  expect(mode.selectedActor).toBe(null);
  expect(mode.manipulation).toBe("turn");
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
  ).toBeLessThanOrEqual(600 - 204);
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
