import { test, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTestGame } from "./helpers/game.js";
import { readModels } from "./helpers/models.js";
import { instantiateModel } from "../src/assets/models.js";
import { createCharacterRig } from "../src/characters/rig.js";
import { createHeldItems } from "../src/characters/held-items.js";

afterEach(() => vi.unstubAllGlobals());

test("appearance presets restore nested overrides and remain independent between instances", async () => {
  const models = await readModels();
  const first = createCharacterRig(instantiateModel(models.companion));
  const second = createCharacterRig(instantiateModel(models.companion));
  const hat = first.head.children.find(
    (node) => node.userData.clothingSlot === "headwear",
  );
  const hair = first.head.getObjectByName("companion-hair-fringe-0");
  const shirt = new THREE.Group();
  shirt.userData.clothingSlot = "torso";
  first.body.add(shirt);
  first.appearance.registerOutfit("summer", {
    parts: [shirt],
    hideSlots: ["torso", "headwear"],
  });
  const scarf = new THREE.Group();
  first.body.add(scarf);
  first.appearance.registerAccessory("scarf", "alpine", [scarf]);
  first.appearance.setAccessory("scarf", "alpine");
  first.appearance.setExpression("surprised");
  const releaseSummer = first.appearance.override({
    outfit: "summer",
    accessories: { scarf: null },
  });
  const releaseSleep = first.appearance.override({ expression: "sleeping" });
  const releaseFireworks = first.appearance.override({
    expression: "delighted",
  });
  assert(shirt.visible && !hat.visible && hair.visible && !scarf.visible);
  assert(first.eyes.open.visible && !first.smile.visible);
  assert(second.smile.visible && second.appearance.state.outfit === "winter");
  releaseSleep(); // Ending an older activity must not clear the newer expression.
  assert.equal(first.appearance.state.expression, "delighted");
  releaseFireworks();
  assert.equal(first.appearance.state.expression, "surprised");
  releaseSummer();
  assert(!shirt.visible && hat.visible && scarf.visible);
  first.appearance.setAccessory("headwear", null);
  assert(!hat.visible && hair.visible);
  first.appearance.clearAccessory("headwear");
  assert(hat.visible);
  first.appearance.override({ expression: "sleeping" });
  first.appearance.reset();
  assert(first.smile.visible && first.eyes.open.visible && !scarf.visible);
  assert.throws(() => first.appearance.setOutfit("missing"), /Unknown outfit/);
  assert.throws(
    () => first.appearance.setExpression("missing"),
    /Unknown expression/,
  );
  assert.throws(
    () => first.appearance.setAccessory("headwear", "missing"),
    /Unknown/,
  );
  assert.equal(first.leftFoot.material, second.leftFoot.material);
});

test("held items use explicit throw permissions, independent hiding reasons, and optional consumption", () => {
  const anchor = new THREE.Group();
  const items = createHeldItems(anchor);
  items.register("snack", { create: () => new THREE.Group() });
  items.register("ball", {
    create: () => new THREE.Group(),
    throwable: true,
    consumeOnThrow: true,
  });
  items.equip("snack");
  assert(anchor.visible && !items.canThrow);
  assert.equal(items.createProjectile(), null);
  items.setHidden("bench", true);
  items.equip("ball");
  items.setHidden("boat", true);
  items.setHidden("bench", false);
  assert(!anchor.visible && !items.canThrow);
  items.setHidden("boat", false);
  assert(items.canThrow);
  assert(items.createProjectile()?.isObject3D);
  assert.equal(items.current, null);
  assert.equal(anchor.children.length, 0);
  assert.throws(() => items.equip("missing"), /Unknown held item/);
});

test("ice cream stays held through clicks, keyboard input, travel, and sitting; restart restores the axe", async () => {
  const { game, element, handlers } = await createTestGame();
  game.rendering.clock.getDelta = () => 0.04;
  const rig = game.characters.rig;
  assert(rig.items.current === "axe" && rig.items.canThrow);
  game.controls.equipItem("ice-cream");
  game.characters.companion.rig.items.equip("ice-cream");
  game.update();
  assert(element("#throw").hidden);
  game.controls.fire();
  element("#throw").onpointerdown({ preventDefault() {} });
  handlers.get("keydown")({
    code: "Space",
    repeat: false,
    preventDefault() {},
  });
  assert.equal(game.effects.axes.length, 0);
  assert.equal(rig.items.current, "ice-cream");
  game.transitions.jump("festival");
  game.update();
  assert(rig.held.visible && rig.appearance.state.outfit === "summer");
  assert(game.characters.companion.rig.held.visible);
  game.transitions.jump("garden");
  const bench = game.worlds.lakeside.bench;
  game.characters.hero.position.copy(bench.position);
  element("#benchAction").onclick();
  game.update();
  assert(!rig.held.visible);
  element("#benchStand").onclick();
  assert(rig.held.visible && rig.items.current === "ice-cream");
  game.controls.resetAdventure();
  game.update();
  assert(rig.items.current === "axe" && rig.items.canThrow);
  assert.equal(game.characters.companion.rig.items.current, null);
  game.controls.fire();
  assert.equal(game.effects.axes.length, 1);
  assert.equal(rig.items.current, "axe"); // The existing repeatable axe is retained.
});
