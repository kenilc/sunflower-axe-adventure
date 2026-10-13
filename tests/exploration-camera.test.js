import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";
import { LOCATION_SAVE_KEY } from "../src/game/location-save.js";

afterEach(() => vi.unstubAllGlobals());

function settle(game, position) {
  const { hero, companion } = game.characters;
  const terrain = game.places.get(game.state.activeLocation).terrain;
  hero.position.copy(position);
  companion.reset(hero.position, terrain.blockers, terrain);
  game.rendering.clock.getDelta = () => 0.04;
  for (let i = 0; i < 80; i++) game.update();
  game.rendering.camera.updateMatrixWorld(true);
  game.rendering.scene.updateMatrixWorld(true);
}

function expectWalkingFrame(game) {
  const { camera } = game.rendering;
  for (const actor of [
    game.characters.hero,
    game.characters.companion.character,
  ]) {
    for (const height of [0, 3.2]) {
      const screen = actor.position
        .clone()
        .add(new THREE.Vector3(0, height, 0))
        .project(camera);
      // Leave a substantial margin beneath both players, including at zoom 10.
      expect(screen.y).toBeGreaterThan(-0.65);
      expect(screen.y).toBeLessThan(0.8);
      expect(Math.abs(screen.x)).toBeLessThan(0.9);
    }
  }
}

function expectMountainsInFrame(game, meshes) {
  const point = new THREE.Vector3();
  for (const mesh of meshes) {
    const vertices = mesh.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld);
      // The rock foundations extend under the meadow and are hidden by it.
      if (point.y < 0) continue;
      point.project(game.rendering.camera);
      expect(Math.abs(point.x)).toBeLessThan(0.95);
      expect(Math.abs(point.y)).toBeLessThan(0.95);
    }
  }
}

test.each(["riverside", "village"])(
  "%s keeps the players above the bottom and shows distant mountains",
  async (area) => {
    const { game } = await createTestGame();
    game.transitions.jump(area);
    const world = game.worlds[area];
    settle(game, world.arrival);
    expectWalkingFrame(game);
    const nearAim = game.places.get(area).cameraTarget();
    const far =
      area === "riverside" ? new THREE.Vector3(9, 0, -20) : world.arrival;
    settle(game, far);
    expectWalkingFrame(game);
    const meshes = [];
    if (area === "riverside") {
      world.group.getObjectByName("waterfall-mountain").traverse((object) => {
        if (object.geometry?.type === "ConeGeometry") meshes.push(object);
      });
      expect(game.places.get(area).cameraTarget()).toBeGreaterThan(nearAim);
    } else {
      // The arrival view sits close enough to see the friends, so the range
      // may run past the sides; its peaks must still be in frame.
      world.group.traverse((object) => {
        if (object.parent?.name === "swiss-mountain-peak") meshes.push(object);
      });
      settle(game, world.route[6]);
      expectWalkingFrame(game);
      expect(game.places.get(area).cameraTarget()).toBeLessThan(nearAim);
      settle(game, far);
    }
    expect(meshes.length).toBeGreaterThan(0);
    expectMountainsInFrame(game, meshes);
  },
);

test.each(["riverside", "village"])(
  "%s keeps close zoom and rotated views framed around the players",
  async (area) => {
    const save = {
      version: 1,
      place: area,
      position: area === "riverside" ? [9, -20] : [0, 20],
      heading: 0,
      view: {
        yaw: area === "riverside" ? Math.PI : 0,
        pitch: THREE.MathUtils.degToRad(6),
        zoom: 10,
        fov: area === "riverside" ? 43 : 55,
      },
    };
    const { game } = await createTestGame({
      storage: {
        getItem: (key) =>
          key === LOCATION_SAVE_KEY ? JSON.stringify(save) : null,
        setItem() {},
      },
    });
    const position = game.characters.hero.position.clone();
    settle(game, position);
    expectWalkingFrame(game);
    const panoramaAim = game.places.get(area).cameraTarget();
    game.input.keys.KeyQ = true;
    for (let i = 0; i < 56; i++) game.update();
    game.input.keys.KeyQ = false;
    settle(game, position);
    expectWalkingFrame(game);
    expect(game.places.get(area).cameraTarget()).toBeLessThan(panoramaAim);
    expect(game.state.zoom).toBe(10);
  },
);
