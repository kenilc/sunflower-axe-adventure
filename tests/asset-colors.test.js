import { test } from "vitest";
import assert from "node:assert/strict";
import * as THREE from "three";
import { stabilizeMaterialColors } from "../scripts/asset-colors.js";

test("export colors ignore runtime rounding while retaining color changes", () => {
  const root = new THREE.Group();
  const materials = [0.4735314961384573, 0.47353149613845735, 0.473532].map(
    (value) => {
      const material = new THREE.MeshStandardMaterial();
      material.color.setRGB(value, value, value);
      material.emissive.setRGB(value, value, value);
      return material;
    },
  );
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), materials));
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), materials[0]));
  stabilizeMaterialColors(root);
  for (const property of ["color", "emissive"]) {
    assert.deepEqual(materials[0][property], materials[1][property]);
    assert.notDeepEqual(materials[0][property], materials[2][property]);
    assert(Math.abs(materials[0][property].r - 0.4735314961384573) < 1e-12);
  }
  const once = materials[0].color.clone();
  stabilizeMaterialColors(root);
  assert.deepEqual(materials[0].color, once);
});
