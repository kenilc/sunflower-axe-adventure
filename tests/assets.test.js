import { test } from "vitest";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readModels } from "./helpers/models.js";
import { instantiateModel } from "../src/assets/models.js";
import { createCharacterRig } from "../src/characters/rig.js";
import { createMeshFactory } from "../src/rendering/mesh-factory.js";
import { createHeroModel } from "../assets/source/hero.js";
import { createCompanionModel } from "../assets/source/companion.js";
import { createBenchModel } from "../assets/source/bench.js";

const models = await readModels();

test("GLB models preserve authoring geometry, material style, and hidden eyes", () => {
  const scene = new THREE.Scene();
  const helpers = createMeshFactory(scene);
  const hero = createHeroModel({ scene, ...helpers });
  hero.hero.position.set(0, 0, 0);
  const companion = createCompanionModel(helpers);
  const original = {
    hero: hero.hero,
    companion: companion.character,
    axe: hero.axe(),
    bench: createBenchModel(helpers),
  };
  for (const [name, source] of Object.entries(original)) {
    const loaded = instantiateModel(models[name]);
    const sourceBounds = new THREE.Box3().setFromObject(source);
    const loadedBounds = new THREE.Box3().setFromObject(loaded);
    assert(
      sourceBounds.min.distanceTo(loadedBounds.min) < 1e-5,
      `${name} lower bounds must match`,
    );
    assert(
      sourceBounds.max.distanceTo(loadedBounds.max) < 1e-5,
      `${name} upper bounds must match`,
    );
    let originalMeshes = 0,
      loadedMeshes = 0;
    source.traverse((node) => {
      if (node.isMesh) originalMeshes++;
    });
    loaded.traverse((node) => {
      if (!node.isMesh) return;
      loadedMeshes++;
      assert(node.castShadow && node.receiveShadow);
      assert.equal(node.material.flatShading, node.userData.flatShading);
    });
    assert.equal(loadedMeshes, originalMeshes, `${name} must retain its parts`);
  }
  for (const name of ["hero", "companion"]) {
    const rig = createCharacterRig(instantiateModel(models[name]));
    assert(rig.eyes.open.visible && !rig.eyes.closed.visible);
    assert(rig.smile.visible);
    assert.equal(rig.leftFoot.parent, rig.leftLeg);
    assert.equal(rig.rightHand.parent, rig.rightArm);
  }
});

test("rig lookup ignores child order and model instances have independent poses", () => {
  const first = instantiateModel(models.hero);
  const second = instantiateModel(models.hero);
  first.traverse((node) => node.children.reverse());
  const a = createCharacterRig(first),
    b = createCharacterRig(second);
  a.leftLeg.rotation.x = 1;
  a.leftFoot.rotation.x = -1;
  a.eyes.setClosed(true);
  a.held.visible = false;
  assert(Math.abs(b.leftLeg.rotation.x) < 1e-12);
  assert(Math.abs(b.leftFoot.rotation.x) < 1e-12);
  assert(b.eyes.open.visible && !b.eyes.closed.visible && b.held.visible);
  assert.equal(a.leftFoot.geometry, b.leftFoot.geometry);
  assert.equal(a.leftFoot.material, b.leftFoot.material);
  assert.throws(
    () => createCharacterRig(new THREE.Group()),
    /missing rig node: body/,
  );
});
