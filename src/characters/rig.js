import { createAppearance } from "./appearance.js";
import { createHeldItems, createIceCream } from "./held-items.js";
import { bindCharacterEyes } from "./eyes.js";

export function createCharacterRig(character) {
  function required(name) {
    const node = character.getObjectByName(name);
    if (!node)
      throw new Error(
        `Character ${character.name} is missing rig node: ${name}`,
      );
    return node;
  }
  const body = required("body");
  const leftLeg = required("left-leg"),
    rightLeg = required("right-leg");
  const leftArm = required("left-arm"),
    rightArm = required("right-arm");
  const leftFoot = required("left-foot"),
    rightFoot = required("right-foot");
  const leftHand = required("left-hand"),
    rightHand = required("right-hand");
  const smile = required("rest-smile");
  const eyes = bindCharacterEyes({
    open: required("open-eyes"),
    closed: required("closed-eyes"),
  });
  eyes.setClosed(false);
  const head = required("head");
  const held = required("held-item-anchor");
  const appearance = createAppearance({ body, head, eyes, smile });
  const items = createHeldItems(held);
  items.register("ice-cream", { create: createIceCream, label: "ice cream" });
  items.equip(null);
  return {
    head,
    appearance,
    items,
    body,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    leftFoot,
    rightFoot,
    leftHand,
    rightHand,
    legs: [leftLeg, rightLeg],
    arms: [leftArm, rightArm],
    feet: [leftFoot, rightFoot],
    hands: [leftHand, rightHand],
    smile,
    eyes,
    held,
  };
}
