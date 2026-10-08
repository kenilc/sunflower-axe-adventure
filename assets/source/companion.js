import { clothing, head } from "./character-parts.js";
import { createCharacterEyes } from "../../src/characters/eyes.js";
import * as THREE from "three";

// Use the hero's geometry and materials for a matching garden companion.
export function createCompanionModel({ ball, box, cyl, mesh }) {
  const character = new THREE.Group();
  const body = new THREE.Group();
  character.add(body);
  const legs = [],
    arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.22, 0.55, 0);
    body.add(leg);
    box(0.32, 0.65, 0.34, "#30343c", 0, -0.14, 0, leg);
    box(0.37, 0.35, 0.55, "#292e35", 0, -0.43, 0.1, leg);
    legs.push(leg);
    const arm = new THREE.Group();
    arm.position.set(side * 0.5, 1.55, 0);
    body.add(arm);
    box(0.32, 0.65, 0.35, "#353a44", side * 0.09, -0.25, 0, arm);
    for (let i = 0; i < 2; i++)
      box(0.34, 0.04, 0.37, "#292e37", side * 0.09, -0.15 - i * 0.23, 0, arm);
    ball(0.17, "#f0bd8a", side * 0.1, -0.63, 0.03, arm);
    arms.push(arm);
  }
  legs.forEach((leg) => {
    clothing([leg.children[0]], "trousers");
    clothing([leg.children[1]], "shoes");
  });
  arms.forEach((arm) => clothing(arm.children.slice(0, 3), "sleeves"));
  const torsoStart = body.children.length;
  cyl(0.46, 0.6, 1.05, "#353a44", 0, 1.17, 0, body);
  // Horizontal quilt seams, a zipper and two backpack straps.
  for (let i = 0; i < 3; i++)
    cyl(
      0.5 + i * 0.035,
      0.5 + i * 0.035,
      0.045,
      "#292e37",
      0,
      1.47 - i * 0.27,
      0,
      body,
    );
  box(0.035, 0.93, 0.04, "#88908e", 0, 1.18, 0.51, body);
  const pack = ball(0.48, "#282d34", 0, 1.22, -0.4, body);
  pack.scale.set(0.88, 1.12, 0.5);
  for (const side of [-1, 1]) {
    const strap = box(
      0.11,
      0.88,
      0.07,
      "#605a50",
      side * 0.35,
      1.25,
      0.38,
      body,
    );
    strap.rotation.z = side * 0.12;
  }
  cyl(0.35, 0.4, 0.22, "#464953", 0, 1.72, 0.03, body);
  clothing(body.children.slice(torsoStart), "torso");
  const headStart = body.children.length;
  ball(0.57, "#352f2c", 0, 2.1, 0, body);
  ball(0.49, "#f0bd8a", 0, 2.12, 0.23, body);
  // A swept fringe stays visible when the summer outfit removes his beanie.
  const crown = ball(0.53, "#352f2c", 0, 2.46, 0.16, body);
  crown.name = "companion-hair-crown";
  crown.scale.set(1, 0.65, 1);
  for (const [index, x] of [-0.3, -0.06, 0.19].entries()) {
    const fringe = ball(0.27, "#352f2c", x, 2.5 - index * 0.035, 0.48, body);
    fringe.name = `companion-hair-fringe-${index}`;
    fringe.scale.set(1.15, 0.65, 0.55);
    fringe.rotation.z = -0.22;
  }
  const eyes = createCharacterEyes({ body, ball, mesh });
  for (const side of [-1, 1]) {
    ball(0.12, "#f0bd8a", side * 0.49, 2.09, 0.13, body);
    const blush = ball(0.075, "#df967c", side * 0.31, 2, 0.61, body);
    blush.scale.y = 0.4;
    const glasses = mesh(
      new THREE.TorusGeometry(0.17, 0.035, 5, 8),
      "#22262b",
      side * 0.21,
      2.16,
      0.704,
      body,
    );
    glasses.scale.set(1.1, 0.87, 1);
    box(0.05, 0.045, 0.38, "#22262b", side * 0.43, 2.19, 0.46, body);
    box(0.18, 0.04, 0.04, "#47352b", side * 0.2, 2.37, 0.63, body);
  }
  box(0.1, 0.045, 0.05, "#22262b", 0, 2.18, 0.73, body);
  const smile = mesh(
    new THREE.TorusGeometry(0.09, 0.016, 5, 12, Math.PI),
    "#845340",
    0,
    2.01,
    0.699,
    body,
  );
  smile.rotation.z = Math.PI;
  const hatStart = body.children.length;
  const hat = ball(0.61, "#30313a", 0, 2.47, 0, body);
  hat.scale.set(1, 0.65, 0.92);
  cyl(0.58, 0.58, 0.21, "#252832", 0, 2.46, 0, body, 12);
  // A small stitched patch keeps the beanie readable at game scale.
  box(0.2, 0.12, 0.035, "#c8c7bd", -0.19, 2.47, 0.553, body);

  clothing(body.children.slice(hatStart), "headwear");
  head(body, body.children.slice(headStart));
  const held = new THREE.Group();
  held.name = "held-item-anchor";
  held.scale.setScalar(0.8);
  held.rotation.z = -0.3;
  held.position.set(0.08, -0.58, 0.25);
  arms[1].add(held);
  return { character, rig: { body, legs, arms, eyes, held } };
}
