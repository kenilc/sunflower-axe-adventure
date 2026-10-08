import { expect, test, vi } from "vitest";
import * as THREE from "three";
import { createCompanionReactions } from "../src/characters/reactions.js";

test("companion gestures preserve locomotion and do not repeat every visit", () => {
  const release = vi.fn(),
    toast = vi.fn();
  const companion = {
    character: new THREE.Group(),
    rig: {
      head: new THREE.Group(),
      arms: [new THREE.Group()],
      appearance: { override: () => release },
    },
  };
  const reactions = createCompanionReactions({ companion, toast });
  const hero = new THREE.Vector3(0, 0, 2);
  reactions.update(0.1, "village", hero);
  expect(toast).not.toHaveBeenCalled();
  reactions.update(2.8, "village", hero);
  expect(toast).toHaveBeenCalledTimes(1);
  const position = companion.character.position.clone();
  for (let i = 0; i < 70; i++) reactions.update(0.04, "village", hero);
  expect(companion.character.position.equals(position)).toBe(true);
  expect(reactions.active).toBeNull();
  expect(release).toHaveBeenCalledTimes(1);
  expect(companion.rig.head.rotation.y).toBe(0);
  expect(companion.rig.arms[0].rotation.x).toBe(0);
  reactions.update(20, "garden", hero);
  reactions.update(3, "village", hero);
  expect(toast).toHaveBeenCalledTimes(1);
  expect(
    reactions.notice("sheep", { target: hero, text: "A woolly hello" }),
  ).toBe(true);
  reactions.update(0.4, "village", hero);
  const gesture = companion.rig.arms[0].rotation.x;
  reactions.update(0, "village", hero);
  expect(companion.rig.arms[0].rotation.x).toBe(gesture);
  reactions.cancel();
  expect(companion.rig.arms[0].rotation.x).toBe(0);
  expect(
    reactions.notice("sheep", { target: hero, text: "A woolly hello" }),
  ).toBe(false);
  reactions.reset();
  expect(
    reactions.notice("sheep", { target: hero, text: "A woolly hello" }),
  ).toBe(true);
});
