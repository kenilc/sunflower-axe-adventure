import * as THREE from "three";
import { createCharacterEyes } from "../../src/characters/eyes.js";

export function createHeroModel({ scene, mesh, box, ball, cyl }) {
  // Flower hood, brown hair, checked scarf and a double-headed axe.
  const hero = new THREE.Group();
  hero.position.set(0, 0, 7);
  hero.rotation.y = 0;
  scene.add(hero);
  const body = new THREE.Group();
  hero.add(body);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.22, 0.55, 0);
    body.add(leg);
    box(0.32, 0.65, 0.34, "#343a37", 0, -0.14, 0, leg);
    box(0.37, 0.35, 0.55, "#715644", 0, -0.43, 0.1, leg);
    legs.push(leg);
  }
  cyl(0.46, 0.6, 1.05, "#414b44", 0, 1.17, 0, body);
  box(0.98, 0.12, 0.72, "#85624a", 0, 0.94, 0, body);
  box(0.18, 0.18, 0.06, "#d8b76d", 0, 0.94, 0.39, body);
  box(0.3, 0.34, 0.22, "#76583c", 0.5, 0.9, 0.18, body);
  ball(0.61, "#473b32", 0, 2.1, 0, body);
  ball(0.49, "#f0bd8a", 0, 2.12, 0.23, body);
  for (let i = 0; i < 12; i++) {
    let a = (i / 12) * Math.PI * 2;
    const p = ball(
      0.23,
      i % 2 ? "#edbb36" : "#ffdb58",
      Math.cos(a) * 0.63,
      2.12 + Math.sin(a) * 0.64,
      0.03,
      body,
    );
    p.scale.set(1, 1.14, 0.88);
  }
  const fringe = ball(0.4, "#46362b", -0.17, 2.47, 0.29, body);
  fringe.scale.set(1, 0.52, 0.65);
  fringe.rotation.z = 0.35;
  const eyes = createCharacterEyes({ body, ball, mesh });
  for (const s of [-1, 1]) {
    const blush = ball(0.075, "#df967c", s * 0.31, 2, 0.61, body);
    blush.scale.y = 0.4;
  }
  const smile = mesh(
    new THREE.TorusGeometry(0.09, 0.016, 5, 12, Math.PI),
    "#845340",
    0,
    2.01,
    0.699,
    body,
  );
  smile.rotation.z = Math.PI;
  const scarf = cyl(0.49, 0.37, 0.28, "#bed7db", 0, 1.72, 0.07, body);
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 2; j++)
      box(
        0.16,
        0.14,
        0.04,
        (i + j) % 2 ? "#cbdde0" : "#7fabb7",
        -0.15 + j * 0.17,
        1.57 - i * 0.14,
        0.49,
        body,
      );
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(s * 0.5, 1.55, 0);
    body.add(a);
    box(0.3, 0.65, 0.32, "#485047", s * 0.09, -0.25, 0, a);
    ball(0.19, "#70513b", s * 0.1, -0.63, 0.03, a);
    arms.push(a);
  }
  function axe() {
    const g = new THREE.Group();
    cyl(0.045, 0.06, 1.45, "#855338", 0, 0, 0, g);
    for (const s of [-1, 1]) {
      const blade = mesh(
        new THREE.CylinderGeometry(0.44, 0.44, 0.11, 5, 1, false, 0, Math.PI),
        "#cfddda",
        s * 0.12,
        0.48,
        0,
        g,
      );
      blade.rotation.z = Math.PI / 2;
      blade.rotation.y = (s * Math.PI) / 2;
    }
    ball(0.12, "#6a7770", 0, 0.5, 0, g);
    return g;
  }
  const held = axe();
  held.scale.setScalar(0.8);
  held.rotation.z = -0.3;
  held.position.set(0.08, -0.58, 0.25);
  arms[1].add(held);
  return { hero, body, legs, arms, held, eyes, axe };
}
