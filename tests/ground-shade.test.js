import * as THREE from "three";
import { expect, test } from "vitest";
import { createGroundShade } from "../src/rendering/ground-shade.js";

const scaleOf = (shade, index) => {
  const matrix = new THREE.Matrix4();
  shade.mesh.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixScale(matrix).x;
};

test("ground shade lies under trees on slopes but skips near-vertical rock", () => {
  const shade = createGroundShade([
    {
      position: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
      radius: 2,
    },
    {
      position: new THREE.Vector3(5, 0, 0),
      normal: new THREE.Vector3(1, 0.3, 0).normalize(),
      radius: 2,
    },
  ]);
  expect(scaleOf(shade, 0)).toBeCloseTo(4);
  expect(scaleOf(shade, 1)).toBe(0);
  // Hiding a tree hides its patch; showing it never brings back a steep one.
  shade.setHidden(0, true);
  expect(scaleOf(shade, 0)).toBe(0);
  shade.setHidden(0, false);
  shade.setHidden(1, false);
  expect(scaleOf(shade, 0)).toBeCloseTo(4);
  expect(scaleOf(shade, 1)).toBe(0);
});
