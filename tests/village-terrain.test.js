import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { createMeshFactory } from "../src/rendering/mesh-factory.js";
import {
  createVillageMeadow,
  creekCenter,
} from "../src/locations/village/terrain.js";

function meadows() {
  const parent = new THREE.Group();
  const { mesh } = createMeshFactory(parent);
  const village = createVillageMeadow({
    mesh,
    parent,
    north: -9,
    south: 100,
    name: "alpine-village-ground",
  });
  const valley = createVillageMeadow({
    mesh,
    parent,
    north: -160,
    south: -9,
    name: "alpine-valley-ground",
  });
  parent.updateWorldMatrix(true, true);
  return { village, valley };
}

describe("village terrain joins", () => {
  test("lawns ease into the valley without a vertical green step", () => {
    const { village, valley } = meadows();
    const sample = (x, z) =>
      (z < -9 ? valley : village).userData.sampleGround(x, z);
    for (const [x, z] of [
      [0, 20],
      [-35, 31],
      [35, -7],
      [-30, -7],
    ])
      expect(sample(x, z).point.y).toBeCloseTo(-0.03, 6);
    for (const [x, z, dx, dz] of [
      [0, 30, 0, 1],
      [35, 20, 1, 0],
      [-35, 20, -1, 0],
      [-30, -7, 0, -1],
    ]) {
      let previous = sample(x, z).point.y;
      for (let i = 1; i <= 30; i++) {
        const hit = sample(x + dx * i, z + dz * i);
        expect(Math.abs(hit.point.y - previous)).toBeLessThan(0.4);
        expect(hit.face.normal.y).toBeGreaterThan(0.9);
        previous = hit.point.y;
      }
      expect(previous).toBeCloseTo(-5, 6);
    }
    for (let x = -100; x <= 100; x += 2)
      expect(village.userData.sampleGround(x, -9).point.y).toBeCloseTo(
        valley.userData.sampleGround(x, -9).point.y,
        6,
      );
  });

  test("the visible stream remains above the triangulated foothill bed", () => {
    const { valley } = meadows();
    for (let z = -75; z <= -13; z += 0.5)
      for (const side of [-1.4, 0, 1.4])
        expect(
          valley.userData.sampleGround(creekCenter(z) + side, z).point.y +
            0.025,
        ).toBeLessThan(-4.91);
  });

  test("fast planting samples agree with the rendered triangles", () => {
    const { village, valley } = meadows();
    const ray = new THREE.Raycaster();
    for (const [x, z] of [
      [45.3, 20.4],
      [0.4, 38.8],
      [-52.7, 45.3],
      [-30.2, -18.5],
      [-4.2, -14.1],
      [20.1, -91.2],
    ]) {
      const source = z < -9 ? valley : village;
      ray.set(new THREE.Vector3(x, 150, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(source, false)[0];
      const sample = source.userData.sampleGround(x, z);
      expect(sample.point.distanceTo(hit.point)).toBeLessThan(1e-5);
      expect(sample.face.normal.distanceTo(hit.face.normal)).toBeLessThan(1e-5);
    }
    expect(village.userData.sampleGround(101, 20)).toBeNull();
    expect(valley.userData.sampleGround(0, 20)).toBeNull();
    expect(village.userData.sampleGround(NaN, 20)).toBeNull();
  });
});
