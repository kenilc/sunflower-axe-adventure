import * as THREE from "three";
import { expect, test } from "vitest";
import { createContactShadows } from "../src/rendering/contact-shadows.js";
import { createTestGame } from "./helpers/game.js";

test("contact shadows follow each actor's feet and hide with them", () => {
  const scene = new THREE.Scene();
  const place = new THREE.Group();
  const actor = new THREE.Group();
  place.position.set(10, 1, 0);
  actor.position.set(2, 0.5, -3);
  place.add(actor);
  scene.add(place);
  const contact = createContactShadows({ scene, actors: [actor] });
  const [shadow] = contact.shadows;
  contact.update();
  expect(shadow.visible).toBe(true);
  expect(shadow.position.x).toBeCloseTo(12);
  expect(shadow.position.z).toBeCloseTo(-3);
  // Just above her feet, over paths and decks.
  expect(shadow.position.y).toBeGreaterThan(1.5);
  expect(shadow.position.y).toBeLessThan(1.6);
  // Lying down, the patch would float beside her.
  actor.rotation.x = -Math.PI / 2;
  contact.update();
  expect(shadow.visible).toBe(false);
  actor.rotation.x = 0;
  place.visible = false;
  contact.update();
  expect(shadow.visible).toBe(false);
});

test("the game grounds both friends with contact shadows", async () => {
  const { game } = await createTestGame();
  const shadows = [];
  game.rendering.scene.traverse((node) => {
    if (node.name === "contact-shadow") shadows.push(node);
  });
  expect(shadows).toHaveLength(2);
  const hero = game.characters.hero.position;
  expect(shadows[0].position.x).toBeCloseTo(hero.x);
  expect(shadows[0].position.z).toBeCloseTo(hero.z);
});
