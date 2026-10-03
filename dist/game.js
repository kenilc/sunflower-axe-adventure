import { createCastleRoom } from "./castle-room.js?v=20261003-treasure-aisle";
import { createCableCar } from "./cable-car.js?v=20261003-great-room";
import { createBoatTrip } from "./boat-trip.js?v=20261003-cable-car";
import * as THREE from "./vendor/three.module.js";
import { createRiverside } from "./riverside.js?v=20261003-cable-car";
import { createCave } from "./cave.js?v=20261003-rocks";
import { createGameAudio } from "./audio.js";
import { createCompanion } from "./companion.js?v=20261003-castle";
import { createHearts } from "./hearts.js?v=20261001-climb";
import { createTreeVisibility } from "./tree-visibility.js?v=20261002-camera-clear";
import { bindCameraDrag } from "./camera-drag.js";
import { resolveObstacleCollisions } from "./collision.js?v=20261003-rocks";
import { createSceneTransition } from "./scene-transition.js";
import {
  createLakeside,
  createBenchMoment,
  inLake,
  reservedLakeside,
} from "./lakeside.js?v=20261003-collisions";
const $ = (s) => document.querySelector(s);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (e) {
  $("#error").hidden = false;
  throw e;
}
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
$("#game").appendChild(renderer.domElement);
const scene = new THREE.Scene();
const hearts = createHearts(scene);
scene.background = new THREE.Color("#96c4b0");
scene.fog = new THREE.FogExp2("#96c4b0", 0.018);
const camera = new THREE.PerspectiveCamera(
  43,
  innerWidth / innerHeight,
  0.1,
  320,
);
scene.add(new THREE.HemisphereLight(0xfff4cf, 0x346457, 2.4));
const sun = new THREE.DirectionalLight(0xffe6a7, 3.4);
sun.position.set(-18, 30, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -45,
  right: 45,
  top: 45,
  bottom: -45,
  near: 0.5,
  far: 100,
});
sun.shadow.bias = -0.0005;
scene.add(sun);
scene.add(sun.target);
const mats = {};
function mat(c) {
  return (mats[c] ??= new THREE.MeshStandardMaterial({
    color: c,
    roughness: 0.88,
    flatShading: true,
  }));
}
function mesh(geo, c, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(geo, typeof c === "string" ? mat(c) : c);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (w, h, d, c, x, y, z, p) =>
  mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z, p);
const ball = (r, c, x, y, z, p) =>
  mesh(new THREE.IcosahedronGeometry(r, 1), c, x, y, z, p);
const cyl = (a, b, h, c, x, y, z, p, n = 8) =>
  mesh(new THREE.CylinderGeometry(a, b, h, n), c, x, y, z, p);
let seed = 9;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const ground = cyl(53, 56, 2.5, "#557e4a", 0, -1.28, 0, scene, 80);
const pathMat = mat("#b8ac73");
function path(x, z, w, d, rot = 0) {
  const p = box(w, 0.04, d, pathMat, x, 0.025, z);
  p.rotation.y = rot;
}
path(0, 0, 5, 70);
path(0, 0, 64, 4);
path(-12, -12, 4, 28, -0.7);
path(13, 10, 4, 28, -0.8);
const blockers = [];
const lakeside = createLakeside({ mesh, box, cyl, ball });
scene.add(lakeside.group);
blockers.push({ x: 6.4, z: 9.6, r: 1.5 });
const gardenTerrain = {
  contains: (x, z) => Math.hypot(x, z) < 48 && !inLake(x, z, 0.65),
  heightAt: () => 0,
};
function rock(x, z, s) {
  const r = ball(s, "#718974", x, s * 0.36, z);
  r.scale.set(1, 0.7, 0.9);
  r.rotation.set(rand(), rand() * 5, rand());
  blockers.push({ x, z, r: s, minClearance: 0.8 });
}
const treeVisibility = createTreeVisibility();
function tree(x, z, s = 1) {
  const g = new THREE.Group();
  scene.add(g);
  g.position.set(x, 0, z);
  cyl(0.18 * s, 0.32 * s, 3 * s, "#645e3a", 0, 1.5 * s, 0, g);
  for (let j = 0; j < 3; j++) {
    const a = cyl(
      0.04,
      (1.7 - j * 0.32) * s,
      2.7 * s,
      ["#245848", "#316750", "#44754e"][j],
      0,
      (2.5 + j * 1.25) * s,
      0,
      g,
      7,
    );
    a.rotation.y = j * 0.6;
  }
  blockers.push({ x, z, r: 0.5 * s });
  treeVisibility.add(g);
}
for (let i = 0; i < 170; i++) {
  let a = rand() * Math.PI * 2,
    r = 15 + rand() * 35,
    x = Math.cos(a) * r,
    z = Math.sin(a) * r;
  if (
    Math.abs(x) < 4 ||
    Math.abs(z) < 3 ||
    reservedLakeside(x, z) ||
    inLake(x, z, 4) ||
    Math.hypot(x - 6.4, z - 9.6) < 7
  )
    continue;
  tree(x, z, 0.65 + rand() * 0.8);
}
for (let i = 0; i < 45; i++) {
  let x = (rand() - 0.5) * 88,
    z = (rand() - 0.5) * 88;
  if (Math.abs(x) > 5 && Math.abs(z) > 5 && !reservedLakeside(x, z))
    rock(x, z, 0.4 + rand() * 1.1);
}
for (let i = 0; i < 550; i++) {
  const x = (rand() - 0.5) * 96,
    z = (rand() - 0.5) * 96;
  if (
    Math.hypot(x, z) > 49 ||
    Math.abs(x) < 3 ||
    Math.abs(z) < 2.4 ||
    reservedLakeside(x, z)
  )
    continue;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  for (let j = 0; j < 3; j++) {
    const grass = mesh(
      new THREE.ConeGeometry(0.09, 0.5 + rand() * 0.25, 3),
      "#82a35d",
      j * 0.14,
      0.25,
      0,
      g,
    );
    grass.rotation.z = (j - 1) * 0.3;
  }
  if (i % 4 === 0) {
    cyl(0.025, 0.025, 0.6, "#68924b", 0, 0.3, 0, g);
    ball(0.12, i % 3 ? "#ffe499" : "#d8a4b0", 0, 0.66, 0, g);
  }
}
// Small patches of sunflowers echo the adventurer's hood.
function sunflower(x, z, size = 1) {
  if (reservedLakeside(x, z)) return;
  const flower = new THREE.Group();
  flower.position.set(x, 0, z);
  flower.scale.setScalar(size);
  flower.rotation.y = rand() * Math.PI * 2;
  scene.add(flower);
  cyl(0.035, 0.055, 1.65, "#52783e", 0, 0.825, 0, flower);
  for (const side of [-1, 1]) {
    const leaf = ball(
      0.24,
      "#73974a",
      side * 0.2,
      0.7 + side * 0.15,
      0,
      flower,
    );
    leaf.scale.set(1.3, 0.4, 0.55);
    leaf.rotation.z = side * 0.4;
  }
  const face = cyl(0.19, 0.19, 0.12, "#684529", 0, 1.7, 0, flower, 12);
  face.rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const petal = ball(
      0.15,
      i % 2 ? "#ffc83d" : "#ffe16a",
      Math.cos(angle) * 0.29,
      1.7 + Math.sin(angle) * 0.29,
      0,
      flower,
    );
    petal.scale.set(1.1, 0.6, 0.35);
    petal.rotation.z = angle;
  }
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI) / 3;
    ball(
      0.025,
      "#a67b39",
      i ? Math.cos(angle) * 0.11 : 0,
      1.7 + (i ? Math.sin(angle) * 0.11 : 0),
      0.075,
      flower,
    );
  }
}
for (const [x, z] of [
  [4.4, 9],
  [-4.5, 6],
  [5.3, 15],
  [-5, -6],
  [9, 4],
])
  sunflower(x, z, 0.85 + rand() * 0.25);
for (let i = 0; i < 38; i++) {
  const angle = rand() * Math.PI * 2,
    radius = 9 + rand() * 34;
  const x = Math.cos(angle) * radius,
    z = Math.sin(angle) * radius;
  if (
    Math.abs(x) < 4 ||
    Math.abs(z) < 3 ||
    blockers.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 1)
  )
    continue;
  sunflower(x, z, 0.8 + rand() * 0.5);
  if (i % 3 === 0) sunflower(x + 0.6, z + 0.4, 0.65 + rand() * 0.2);
}
// Ruined garden archways and a central sun shrine.
function arch(x, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  for (const side of [-1, 1]) {
    box(1.25, 0.4, 1.25, "#819487", side * 2, 0.2, 0, g);
    for (let i = 0; i < 5; i++)
      box(
        0.82,
        0.65,
        0.9,
        i % 2 ? "#9da996" : "#8a9f90",
        side * 2,
        0.7 + i * 0.66,
        0,
        g,
      );
    ball(0.48, "#738963", side * 2, 3.55, 0, g);
  }
  box(5.15, 0.65, 1.1, "#a5ae94", 0, 4, 0, g);
  box(5.5, 0.18, 1.4, "#779663", 0, 4.42, 0, g);
  blockers.push(
    { x: x + Math.cos(rot) * 2, z: z - Math.sin(rot) * 2, r: 0.8 },
    { x: x - Math.cos(rot) * 2, z: z + Math.sin(rot) * 2, r: 0.8 },
  );
}
arch(0, -15);
arch(21, 0, Math.PI / 2);
arch(-21, 0, Math.PI / 2);
arch(0, 25);
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * Math.PI * 2;
  const x = Math.sin(a) * 5,
    z = Math.cos(a) * 5 - 30;
  cyl(0.5, 0.7, 1 + rand() * 2, "#92a18a", x, 1, z);
  blockers.push({ x, z, r: 0.7 });
}
const shrine = new THREE.Group();
shrine.position.set(0, 0, -30);
scene.add(shrine);
cyl(2.7, 3, 0.3, "#8b9b86", 0, 0.15, 0, shrine, 12);
cyl(1.8, 2, 0.5, "#b3b39a", 0, 0.5, 0, shrine, 8);
cyl(0.8, 1.1, 1.4, "#899d88", 0, 1.3, 0, shrine);
blockers.push({ x: 0, z: -30, r: 3 });
const relic = mesh(
  new THREE.OctahedronGeometry(0.75),
  new THREE.MeshStandardMaterial({
    color: 0xffd063,
    emissive: 0xffa82e,
    emissiveIntensity: 0.8,
    metalness: 0.5,
    roughness: 0.25,
  }),
  0,
  2.8,
  0,
  shrine,
);
const ring = mesh(
  new THREE.TorusGeometry(1.3, 0.045, 6, 48),
  "#f8d882",
  0,
  2.8,
  0,
  shrine,
);
const glow = new THREE.PointLight(0xffd16c, 6, 9);
glow.position.set(0, 3, -30);
scene.add(glow);
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
for (const s of [-1, 1]) {
  ball(0.077, "#302d25", s * 0.19, 2.15, 0.672, body);
  ball(0.022, "#fff9dd", s * 0.19 - 0.015, 2.175, 0.733, body);
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
const targetPositions = [
  [-7, 3],
  [7, 0],
  [-10, -8],
  [10, -12],
  [-5, -22],
  [8, -29],
  [24, -8],
  [29, 5],
  [17, 17],
  [-17, 17],
  [-29, -6],
  [-28, 11],
];
const targets = [];
for (const [x, z] of targetPositions) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  cyl(0.12, 0.17, 1.45, "#79533a", 0, 0.73, 0, g);
  const disk = cyl(0.68, 0.68, 0.18, "#bf8a49", 0, 1.6, 0, g, 16);
  disk.rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const t = mesh(
      new THREE.TorusGeometry(0.18 + i * 0.18, 0.04, 5, 24),
      i === 0 ? "#ffe4a0" : "#714c32",
      0,
      1.6,
      0.102,
      g,
    );
  }
  const blocker = { x, z, r: 0.7, active: true };
  blockers.push(blocker);
  targets.push({ g, blocker, hit: false, pos: new THREE.Vector3(x, 1.6, z) });
}
const gemPositions = [
  [-12, 8],
  [12, 7],
  [-17, -14],
  [15, -23],
  [-6, -35],
  [28, -15],
  [24, 21],
  [-27, 22],
];
const gems = [];
for (const [x, z] of gemPositions) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  cyl(0.65, 0.8, 0.35, "#a0a281", 0, 0.18, 0, g);
  const crystal = mesh(
    new THREE.OctahedronGeometry(0.38),
    new THREE.MeshStandardMaterial({
      color: 0xffd66c,
      emissive: 0xffaf22,
      emissiveIntensity: 0.6,
      metalness: 0.35,
      roughness: 0.2,
    }),
    0,
    1,
    0,
    g,
  );
  gems.push({ g, crystal, got: false });
}
// Keep the garden intact while exploring the separate treasure chamber.
const garden = new THREE.Group();
for (const child of [...scene.children])
  if (
    child !== hero &&
    child !== sun &&
    child !== sun.target &&
    !child.isHemisphereLight
  )
    garden.add(child);
scene.add(garden);
const cave = createCave();
garden.add(cave.entrance);
scene.add(cave.interior);
blockers.push(
  { x: -4, z: -43, r: 2.5, minClearance: 0.8 },
  { x: 4, z: -43, r: 2.5, minClearance: 0.8 },
);
const cavePath = box(4, 0.04, 10, pathMat, 0, 0.025, -39);
garden.add(cavePath);
const riverside = createRiverside({ mesh, box, cyl, ball });
garden.add(riverside.entrance);
scene.add(riverside.group);
blockers.push({ x: -32, z: -2, r: 0.45 }, { x: -32, z: 2, r: 0.45 });
const castleRoom = createCastleRoom({ mesh, box, cyl, ball });
scene.add(castleRoom.group);
const companion = createCompanion({ ball, box, cyl, mesh });
garden.add(companion.character);
const companionObstacles = [
  ...blockers,
  ...gemPositions.map(([x, z]) => ({ x, z, r: 0.8 })),
];
const benchMoment = createBenchMoment({
  bench: lakeside.bench,
  hero,
  heroRig: { body, legs, arms, held },
  companion,
  hearts,
  toast,
});
const boatTrip = createBoatTrip({
  mesh,
  box,
  cyl,
  ball,
  scene,
  riverside,
  hero,
  heroRig: { body, legs, arms, held },
  companion,
  toast,
  onSceneChange(atLagoon) {
    hearts.clear();
    $(".quest .eyebrow").textContent = atLagoon
      ? "THE LOTUS LAGOON"
      : "THE RAINBOW RIVERSIDE";
    $(".quest h1").innerHTML = atLagoon
      ? "A boat for two.<br />A sunflower paradise."
      : "A gentle river.<br />A rainbow of treasures.";
    $("#objective").textContent = atLagoon
      ? boatTrip.lagoon.collected === 240
        ? "Your lagoon collection is complete! Enjoy the sunflowers together."
        : "Wander through 900 sunflowers and collect 240 colourful gems and stones."
      : riverObjective();
    $("#riverCounts").hidden = atLagoon;
    $("#lagoonCounts").hidden = !atLagoon;
    scene.background.set(atLagoon ? "#c0ded9" : "#b6d9ce");
    scene.fog.color.copy(scene.background);
    scene.fog.density = atLagoon ? 0.006 : 0.011;
    cableCar.setEnabled(atLagoon);
    if (atLagoon) {
      yaw = 0;
      pitch = THREE.MathUtils.degToRad(16);
      zoom = 20;
    }
    camera.position
      .set(
        Math.sin(yaw) * Math.cos(pitch) * zoom,
        1 + Math.sin(pitch) * zoom,
        Math.cos(yaw) * Math.cos(pitch) * zoom,
      )
      .add(hero.position);
    camera.lookAt(
      hero.position.x,
      hero.position.y + cameraTargetHeight(),
      hero.position.z,
    );
  },
});
const cableCar = createCableCar({
  scene,
  riverside,
  lagoon: boatTrip.lagoon,
  hero,
  heroRig: { body, legs, arms, held },
  companion,
  mesh,
  box,
  cyl,
  toast,
  onArrival(atSummit) {
    hearts.clear();
    yaw = 0;
    pitch = THREE.MathUtils.degToRad(atSummit ? 30 : 16);
    zoom = atSummit ? 22 : 20;
    $(".quest .eyebrow").textContent = atSummit
      ? "THE SUMMIT CASTLE"
      : "THE LOTUS LAGOON";
    $(".quest h1").innerHTML = atSummit
      ? "A castle in the clouds.<br />A cozy room for two."
      : "A boat for two.<br />A sunflower paradise.";
    $("#objective").textContent = atSummit
      ? "Walk through the open castle arch. Return cable car: beside the castle."
      : boatTrip.lagoon.collected === 240
        ? "Your lagoon collection is complete! Enjoy the flowers and the mountain cable car."
        : "Explore the flowers and gemstones. Cable car: north end of the central island.";
    camera.position
      .set(
        Math.sin(yaw) * Math.cos(pitch) * zoom,
        1 + Math.sin(pitch) * zoom,
        Math.cos(yaw) * Math.cos(pitch) * zoom,
      )
      .add(hero.position);
  },
});
function boardCableCar() {
  if (
    insideCastle ||
    !insideRiver ||
    !boatTrip.atLagoon ||
    boatTrip.rowing ||
    $("#guide").open ||
    passageTransition.active
  )
    return;
  if (cableCar.start()) {
    cameraDrag.reset();
    Object.keys(keys).forEach((key) => {
      keys[key] = false;
    });
    joy.set(0, 0);
    hearts.clear();
    axes.forEach((a) => scene.remove(a.g));
    axes.length = 0;
    yaw = cableCar.atSummit ? Math.PI : 0;
    pitch = THREE.MathUtils.degToRad(16);
    zoom = 16;
  }
}
$("#cableAction").onclick = boardCableCar;
function boardBoat() {
  if (
    insideCastle ||
    !insideRiver ||
    $("#guide").open ||
    passageTransition.active ||
    cableCar.riding ||
    cableCar.atSummit
  )
    return;
  if (boatTrip.start()) {
    hearts.clear();
    axes.forEach((a) => scene.remove(a.g));
    axes.length = 0;
  }
}
$("#boatAction").onclick = boardBoat;
$("#benchAction").onclick = () => {
  if (!insideCave && !insideRiver && !passageTransition.active)
    benchMoment.sit();
};
$("#benchStand").onclick = () => benchMoment.stand();
let insideCastle = false,
  castleOutsideView = null;
let insideCave = false,
  insideRiver = false,
  riverCollected = 0,
  passageCooldown = 0,
  outsideView = null,
  outsideObjective = "";
const passageTransition = createSceneTransition((opacity) => {
  $("#sceneTransition").style.opacity = String(opacity);
});
function useCastlePassage(enter) {
  if (
    enter === insideCastle ||
    !insideRiver ||
    !cableCar.atSummit ||
    cableCar.riding
  )
    return;
  if (!passageTransition.start(() => changeCastlePassage(enter))) return;
  cameraDrag.reset();
  Object.keys(keys).forEach((key) => (keys[key] = false));
  joy.set(0, 0);
  isMoving = false;
}
function changeCastlePassage(enter) {
  if (enter === insideCastle) return;
  insideCastle = enter;
  castleActivityCooldown = 0;
  castleMusicSession++;
  held.visible = !enter;
  hearts.clear();
  axes.forEach((a) => scene.remove(a.g));
  axes.length = 0;
  if (enter)
    castleOutsideView = {
      yaw,
      pitch,
      zoom,
      instructions: $(".instructions").innerHTML,
    };
  castleRoom.group.visible = enter;
  cableCar.group.visible = !enter;
  boatTrip.lagoon.group.visible = false;
  boatTrip.boat.visible = !enter;
  if (enter) {
    castleRoom.group.add(companion.character);
    hero.position.set(0, 0, 8.5);
    companion.reset(hero.position, castleRoom.blockers, castleRoom);
    yaw = 0;
    pitch = THREE.MathUtils.degToRad(28);
    zoom = 22;
    hero.rotation.y = Math.PI;
  } else {
    cableCar.summit.group.add(companion.character);
    hero.position.copy(cableCar.summit.castle.entrance);
    companion.reset(hero.position, cableCar.summit.blockers, cableCar.summit);
    if (castleOutsideView) ({ yaw, pitch, zoom } = castleOutsideView);
    hero.rotation.y = 0;
  }
  scene.background.set(enter ? "#cab5b0" : "#c0ded9");
  scene.fog.color.copy(scene.background);
  scene.fog.density = enter ? 0.009 : 0.006;
  sun.intensity = enter ? 1.7 : 3.4;
  scene.children.find((c) => c.isHemisphereLight).intensity = enter ? 1.6 : 2.4;
  camera.position
    .set(
      Math.sin(yaw) * Math.cos(pitch) * zoom,
      1 + Math.sin(pitch) * zoom,
      Math.cos(yaw) * Math.cos(pitch) * zoom,
    )
    .add(hero.position);
  camera.lookAt(hero.position.x, hero.position.y + 1, hero.position.z);
  passageCooldown = 1;
  $("#lagoonCounts").hidden = enter;
  $(".instructions").innerHTML = enter
    ? "<kbd>W A S D</kbd> move <kbd>X</kbd> interact <kbd>DRAG / Q E</kbd> rotate <kbd>R / F</kbd> view up / down"
    : castleOutsideView?.instructions;
  $("#castleCounts").hidden = !enter;
  $("#castleStars").textContent = castleRoom.collected;
  $(".quest .eyebrow").textContent = enter
    ? "THE CLOUD CASTLE"
    : "THE SUMMIT CASTLE";
  $(".quest h1").innerHTML = enter
    ? "A home above the clouds.<br />Little wonders to discover."
    : "A castle in the clouds.<br />A cozy room for two.";
  $("#objective").textContent = enter
    ? castleRoom.objective()
    : "Enter the castle to explore its great room. Cable car: beside the castle.";
  toast(
    enter
      ? "Welcome home · Find stars, share tea, play music, and read a story. Activities: X."
      : "Back at the summit · Cable car: beside the castle · C.",
  );
}
let castleActivityCooldown = 0,
  castleMusicSession = 0;
function interactCastle() {
  if (
    !insideCastle ||
    passageTransition.active ||
    $("#guide").open ||
    castleActivityCooldown > 0
  )
    return;
  const action = castleRoom.interact(hero.position, clock.elapsedTime);
  if (!action) return;
  castleActivityCooldown = action.kind === "piano" ? 3 : 0.8;
  toast(action.message);
  $("#objective").textContent = castleRoom.objective();
  if (action.kind === "piano") {
    const session = castleMusicSession;
    [523, 659, 784, 659, 587, 698, 880, 1047].forEach((note, i) =>
      setTimeout(() => {
        if (insideCastle && session === castleMusicSession && !$("#guide").open)
          beep(note, 0.18);
      }, i * 240),
    );
  } else if (action.kind === "tea") {
    hearts.contact(true, hero.position, companion.character.position);
    beep(660, 0.2);
  } else if (action.kind === "chest") {
    burst(castleRoom.rewardPosition.clone(), "#ffe399", 45);
    beep(1047, 0.5);
  }
}
$("#castleAction").onclick = interactCastle;
function usePassage(enter, river = false) {
  if (enter === (river ? insideRiver : insideCave)) return;
  if (!passageTransition.start(() => changePassage(enter, river))) return;
  cameraDrag.reset();
  Object.keys(keys).forEach((key) => (keys[key] = false));
  joy.set(0, 0);
  isMoving = false;
}
function changePassage(enter, river = false) {
  if (enter === (river ? insideRiver : insideCave)) return;
  if (insideCastle) changeCastlePassage(false);
  const leavingRiver = insideRiver;
  cableCar.reset();
  boatTrip.reset();
  const terrain = river ? riverside : cave;
  benchMoment.stand();
  hearts.clear();
  if (enter) {
    outsideView = { yaw, pitch, zoom };
    outsideObjective = $("#objective").textContent;
  }
  insideCave = enter && !river;
  insideRiver = enter && river;
  boatTrip.setEnabled(insideRiver);
  riverside.group.visible = insideRiver;
  garden.visible = !enter;
  cave.interior.visible = insideCave;
  scene.background.set(
    insideCave ? "#17151c" : insideRiver ? "#b6d9ce" : "#96c4b0",
  );
  scene.fog.color.copy(scene.background);
  scene.fog.density = insideCave ? 0.026 : insideRiver ? 0.011 : 0.018;
  sun.intensity = insideCave ? 0.45 : 3.4;
  const sky = scene.children.find((c) => c.isHemisphereLight);
  sky.intensity = insideCave ? 0.7 : 2.4;
  if (enter) {
    (river ? riverside.group : cave.interior).add(companion.character);
    if (river) hero.position.copy(riverside.arrival);
    else hero.position.set(0, 0, 9);
    companion.reset(hero.position, terrain.blockers, terrain);
    hero.rotation.y = river ? 0 : Math.PI;
    yaw = river ? Math.PI : 0;
    pitch = THREE.MathUtils.degToRad(river ? 6 : 16);
    zoom = river ? 26 : 20;
  } else {
    garden.add(companion.character);
    hero.position.set(leavingRiver ? -28 : 0, 0, leavingRiver ? 0 : -38.5);
    companion.reset(hero.position, companionObstacles, gardenTerrain);
    hero.rotation.y = 0;
    if (outsideView) ({ yaw, pitch, zoom } = outsideView);
  }
  for (const a of axes) scene.remove(a.g);
  axes.length = 0;
  for (const p of particles) {
    scene.remove(p.m);
    p.m.geometry.dispose();
  }
  particles.length = 0;
  camera.position
    .set(
      Math.sin(yaw) * Math.cos(pitch) * zoom,
      1 + Math.sin(pitch) * zoom,
      Math.cos(yaw) * Math.cos(pitch) * zoom,
    )
    .add(hero.position);
  camera.lookAt(
    hero.position.x,
    hero.position.y + cameraTargetHeight(),
    hero.position.z,
  );
  passageCooldown = 1;
  $("#riverCounts").hidden = !insideRiver;
  $("#lagoonCounts").hidden = true;
  $("#gardenCounts").hidden = insideRiver;
  $(".quest h1").innerHTML = insideRiver
    ? "A gentle river.<br />A rainbow of treasures."
    : "A little wander.<br />A mighty axe.";
  $(".quest .eyebrow").textContent = insideRiver
    ? "THE RAINBOW RIVERSIDE"
    : enter
      ? "THE GOLDEN GROTTO"
      : "THE SUNKEN GARDEN";
  $("#objective").textContent = insideRiver
    ? riverObjective()
    : enter
      ? "A mountain of gold. Explore the hoard, then follow the blue light south to leave."
      : outsideObjective;
  $("#caveHint").textContent = insideRiver
    ? "Enjoy the mountain waterfall. Return gate: beside the rainbow lookout."
    : enter
      ? "Exit: south passage, through the blue light."
      : "River gate: west path. Treasure cave: north. Lake & bench: southeast.";
  toast(
    insideRiver
      ? "Rainbow Riverside · Follow the banks and gather colourful treasures"
      : enter
        ? "The Golden Grotto · A fortune beneath the forest"
        : "Back in the sunken garden",
  );
  beep(enter ? 660 : 440, 0.35);
}
function cameraTargetHeight() {
  // Frame the characters in the foreground and the tall mountain above them.
  return insideCastle
    ? 1
    : cableCar.atSummit && !cableCar.riding
      ? 5
      : cableCar.riding
        ? 3
        : insideRiver && !boatTrip.atLagoon && !boatTrip.rowing
          ? 9
          : 1;
}
function riverObjective() {
  return riverCollected === riverside.treasures.length
    ? "All riverside treasures collected! Enjoy the ducks and the gentle river."
    : "Find hidden gem clusters near the picnic, boat, gazebo, and rainbow waterfall.";
}
const keys = {};
let yaw = 0,
  pitch = THREE.MathUtils.degToRad(16),
  zoom = 20,
  isMoving = false,
  cooldown = 0,
  score = 0,
  collected = 0,
  won = false,
  walk = 0,
  throwAnim = 0;
const axes = [],
  particles = [];
let sound = true;
const audio = createGameAudio(() => insideCave);
function beep(freq, duration = 0.1) {
  audio.effect(freq, duration);
}
let toastUntil = 0;
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").style.opacity = 1;
  toastUntil = performance.now() + 3200;
}
function burst(pos, c, n = 14) {
  for (let i = 0; i < n; i++) {
    const m = box(0.09, 0.09, 0.09, c, pos.x, pos.y, pos.z);
    particles.push({
      m,
      v: new THREE.Vector3(
        (rand() - 0.5) * 5,
        rand() * 4 + 1,
        (rand() - 0.5) * 5,
      ),
      life: 0.7 + rand() * 0.4,
    });
  }
}
async function setSound(value) {
  sound = value;
  $("#sound").textContent = sound ? "Sound on" : "Sound off";
  $("#sound").setAttribute("aria-pressed", String(sound));
  try {
    await audio.setEnabled(sound);
  } catch {
    sound = false;
    await audio.setEnabled(false);
    $("#sound").textContent = "Sound off";
    $("#sound").setAttribute("aria-pressed", "false");
    toast("Audio could not start. Tap Sound to try again.");
  }
}
// Enable audio now; the existing gesture listeners resume it if autoplay is blocked.
void setSound(true);
function fire() {
  if (
    cooldown > 0 ||
    $("#guide").open ||
    insideCastle ||
    benchMoment.seated ||
    boatTrip.rowing ||
    cableCar.riding ||
    passageTransition.active
  )
    return;
  cooldown = 0.46;
  throwAnim = 0.3;
  const dir = new THREE.Vector3(
    Math.sin(hero.rotation.y),
    0,
    Math.cos(hero.rotation.y),
  );
  const a = axe();
  a.position
    .copy(hero.position)
    .add(new THREE.Vector3(0, 1.5, 0))
    .addScaledVector(dir, 0.8);
  scene.add(a);
  axes.push({ g: a, dir, life: 1.65 });
  beep(220, 0.15);
}
addEventListener("keydown", (e) => {
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (passageTransition.active) return;
  keys[e.code] = true;
  if (
    e.code === "KeyB" &&
    !e.repeat &&
    !$("#guide").open &&
    !insideCave &&
    !insideRiver
  ) {
    if (benchMoment.seated) benchMoment.stand();
    else benchMoment.sit();
  }
  if (e.code === "KeyT" && !e.repeat) boardBoat();
  if (e.code === "KeyC" && !e.repeat) boardCableCar();
  if (e.code === "KeyX" && !e.repeat) interactCastle();
  if (e.code === "Space") fire();
});
addEventListener("keyup", (e) => (keys[e.code] = false));
addEventListener("blur", () => {
  cameraDrag.reset();
  Object.keys(keys).forEach((k) => (keys[k] = false));
  joy.set(0, 0);
});
const cameraDrag = bindCameraDrag(renderer.domElement, {
  rotate(dx) {
    yaw -= dx * 0.006;
  },
  throwAxe: fire,
  paused: () => $("#guide").open || passageTransition.active,
});
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.012, 10, 26);
    e.preventDefault();
  },
  { passive: false },
);
$("#help").onclick = () => {
  cameraDrag.reset();
  $("#guide").showModal();
  Object.keys(keys).forEach((k) => (keys[k] = false));
};
$("#close").onclick = () => $("#guide").close();
$("#sound").onclick = () => setSound(!sound);
$("#throw").onpointerdown = (e) => {
  e.preventDefault();
  fire();
};
const joy = new THREE.Vector2();
let stickId = null;
$("#stick").onpointerdown = (e) => {
  stickId = e.pointerId;
  $("#stick").setPointerCapture(stickId);
  stickMove(e);
};
function stickMove(e) {
  if (e.pointerId !== stickId) return;
  const r = $("#stick").getBoundingClientRect();
  joy.set((e.clientX - r.left - 55) / 40, (e.clientY - r.top - 55) / 40);
  if (joy.length() > 1) joy.normalize();
  $("#knob").style.transform = `translate(${joy.x * 33}px,${joy.y * 33}px)`;
}
$("#stick").onpointermove = stickMove;
$("#stick").onpointerup = $("#stick").onpointercancel = () => {
  stickId = null;
  joy.set(0, 0);
  $("#knob").style.transform = "";
};
$("#restart").onclick = () => {
  passageTransition.cancel();
  cameraDrag.reset();
  benchMoment.stand();
  if (insideCastle) changeCastlePassage(false);
  castleRoom.reset();
  cableCar.reset();
  boatTrip.reset(true);
  $("#lagoonGems").textContent = 0;
  if (insideCave || insideRiver) changePassage(false, insideRiver);
  hero.position.set(0, 0, 7);
  companion.reset();
  hearts.clear();
  yaw = 0;
  pitch = THREE.MathUtils.degToRad(16);
  hero.rotation.y = 0;
  camera.position
    .set(0, 1 + Math.sin(pitch) * zoom, Math.cos(pitch) * zoom)
    .add(hero.position);
  camera.lookAt(
    hero.position.x,
    hero.position.y + cameraTargetHeight(),
    hero.position.z,
  );
  score = collected = riverCollected = 0;
  riverside.reset();
  $("#riverGems").textContent = 0;
  won = false;
  targets.forEach((t) => {
    t.hit = false;
    t.blocker.active = true;
    t.g.visible = true;
  });
  gems.forEach((g) => {
    g.got = false;
    g.g.visible = true;
  });
  axes.forEach((a) => scene.remove(a.g));
  axes.length = 0;
  $("#targets").textContent = 0;
  $("#gems").textContent = 0;
  $("#objective").textContent =
    "Break the wooden targets and find the sunstones.";
  toast("A fresh adventure begins");
};
let hudIdleDelay = 0;
function updateHudVisibility(moving, dt, paused) {
  hudIdleDelay = paused ? 0 : moving ? 0.9 : Math.max(0, hudIdleDelay - dt);
  document.body.classList.toggle("is-moving", hudIdleDelay > 0);
}
const clock = new THREE.Clock();
const desired = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  let dt = Math.min(clock.getDelta(), 0.04),
    time = clock.elapsedTime;
  const transitioning = passageTransition.active;
  if (!$("#guide").open) passageTransition.update(dt);
  const paused = $("#guide").open || transitioning;
  cooldown = Math.max(0, cooldown - dt);
  throwAnim = Math.max(0, throwAnim - dt);
  castleActivityCooldown = Math.max(0, castleActivityCooldown - dt);
  if (!paused) {
    benchMoment.update(dt);
    passageCooldown = Math.max(0, passageCooldown - dt);
    yaw += ((keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0)) * dt * 1.4;
    pitch = THREE.MathUtils.clamp(
      pitch + ((keys.KeyR ? 1 : 0) - (keys.KeyF ? 1 : 0)) * dt * 0.65,
      THREE.MathUtils.degToRad(6),
      THREE.MathUtils.degToRad(70),
    );
    if (cableCar.riding) {
      cableCar.update(dt);
      isMoving = false;
    } else if (boatTrip.rowing) {
      boatTrip.update(dt);
      isMoving = false;
    } else {
      const riverTerrain = insideCastle
        ? castleRoom
        : cableCar.atSummit
          ? cableCar.summit
          : boatTrip.atLagoon
            ? boatTrip.lagoon
            : riverside;
      let dx =
          (keys.KeyD || keys.ArrowRight ? 1 : 0) -
          (keys.KeyA || keys.ArrowLeft ? 1 : 0) +
          joy.x,
        dz =
          (keys.KeyS || keys.ArrowDown ? 1 : 0) -
          (keys.KeyW || keys.ArrowUp ? 1 : 0) +
          joy.y;
      let movement = new THREE.Vector3(dx, 0, dz);
      if (benchMoment.seated) movement.set(0, 0, 0);
      if (movement.length() > 1) movement.normalize();
      movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const speed = keys.ShiftLeft || keys.ShiftRight ? 7.8 : 4.7;
      const old = hero.position.clone();
      hero.position.addScaledVector(movement, dt * speed);
      const movementObstacles = benchMoment.seated
        ? []
        : insideRiver
          ? riverTerrain.blockers
          : insideCave
            ? cave.blockers
            : blockers;
      resolveObstacleCollisions(hero.position, old, movementObstacles);
      if (insideRiver) {
        if (!riverTerrain.contains(hero.position.x, hero.position.z))
          hero.position.copy(old);
        hero.position.y = riverTerrain.heightAt(
          hero.position.x,
          hero.position.z,
        );
      } else if (insideCave) {
        cave.constrain(hero.position);
        resolveObstacleCollisions(hero.position, old, movementObstacles);
        if (Math.hypot(hero.position.x, hero.position.z) > 16)
          hero.position.copy(old);
        hero.position.y = cave.heightAt(hero.position.x, hero.position.z);
      } else {
        if (hero.position.length() > 49) hero.position.setLength(49);
        resolveObstacleCollisions(hero.position, old, movementObstacles);
        if (hero.position.length() > 49) hero.position.copy(old);
        if (
          !benchMoment.seated &&
          inLake(hero.position.x, hero.position.z, 0.4)
        )
          hero.position.copy(old);
      }
      if (!benchMoment.seated) {
        const playerBump = companion.blocksPlayer(hero.position, old);
        const companionBump = companion.update(
          dt,
          insideRiver
            ? riverTerrain.blockers
            : insideCave
              ? cave.blockers
              : companionObstacles,
          hero.position,
          insideRiver ? riverTerrain : insideCave ? cave : gardenTerrain,
        );
        hearts.contact(
          playerBump || companionBump,
          hero.position,
          companion.character.position,
        );
      }
      isMoving = movement.length() > 0.05;
      if (!benchMoment.seated && isMoving) {
        walk += dt * speed * 2;
        body.position.y = Math.abs(Math.sin(walk)) * 0.055;
        legs[0].rotation.x = Math.sin(walk) * 0.5;
        legs[1].rotation.x = -Math.sin(walk) * 0.5;
        const facing = hero.position.clone().sub(old);
        if (facing.lengthSq() > 0.000001)
          hero.rotation.y = Math.atan2(facing.x, facing.z);
      } else if (!benchMoment.seated) {
        legs.forEach((l) => (l.rotation.x *= 0.8));
        body.position.y = Math.sin(time * 2) * 0.018;
      }
      if (!benchMoment.seated) {
        arms[1].rotation.x =
          throwAnim > 0
            ? -Math.sin((throwAnim / 0.3) * Math.PI) * 2
            : Math.sin(walk) * 0.12;
        arms[0].rotation.x = -legs[0].rotation.x * 0.5;
      }
      for (let i = axes.length - 1; i >= 0; i--) {
        const a = axes[i];
        a.life -= dt;
        a.g.position.addScaledVector(a.dir, dt * 19);
        a.g.rotation.x += dt * 18;
        a.g.rotation.z += dt * 6;
        for (const t of insideCave || insideRiver ? [] : targets) {
          if (!t.hit && a.g.position.distanceTo(t.pos) < 0.93) {
            t.hit = true;
            t.blocker.active = false;
            t.g.visible = false;
            score++;
            $("#targets").textContent = score;
            burst(t.pos, "#dab56c", 22);
            beep(130, 0.2);
            a.life = 0;
            toast(
              score === 12
                ? "All targets cleared. Nicely thrown!"
                : `Target down · ${score} / 12`,
            );
            break;
          }
        }
        if (a.life <= 0) {
          scene.remove(a.g);
          axes.splice(i, 1);
        }
      }
      for (const g of insideCave || insideRiver ? [] : gems) {
        if (!g.got && g.g.position.distanceTo(hero.position) < 1.35) {
          g.got = true;
          g.g.visible = false;
          collected++;
          $("#gems").textContent = collected;
          burst(
            g.g.position.clone().add(new THREE.Vector3(0, 1, 0)),
            "#ffe392",
            22,
          );
          beep(880, 0.3);
          toast(`Sunstone found · ${collected} / 8`);
        }
      }
      if (insideRiver && boatTrip.atLagoon && !cableCar.atSummit) {
        const pickup = boatTrip.lagoon.collect(hero.position);
        if (pickup) {
          $("#lagoonGems").textContent = pickup.total;
          burst(pickup.position, pickup.color, 12);
          beep(880, 0.12);
          toast(
            pickup.total === 240
              ? "✦ All 240 lagoon treasures collected!"
              : `Gemstones found · ${pickup.total} / 240`,
          );
          if (pickup.total === 240)
            $("#objective").textContent =
              "Your lagoon collection is complete! Enjoy the sunflowers together.";
        }
      }
      if (insideRiver && !boatTrip.atLagoon) {
        for (const t of riverside.treasures) {
          if (
            !t.got &&
            Math.hypot(
              hero.position.x - t.crystal.position.x,
              hero.position.z - t.crystal.position.z,
            ) < 1.15
          ) {
            t.got = true;
            t.crystal.visible = t.glow.visible = false;
            riverCollected++;
            $("#riverGems").textContent = riverCollected;
            $("#objective").textContent = riverObjective();
            burst(t.crystal.position.clone(), t.color, 18);
            beep(660 + riverCollected * 25, 0.2);
            toast(
              riverCollected === riverside.treasures.length
                ? "✦ Your riverside collection is complete!"
                : `${t.name} found · ${riverCollected} / ${riverside.treasures.length}`,
            );
          }
        }
      }
      if (
        !insideCave &&
        !insideRiver &&
        score === 12 &&
        collected === 8 &&
        !won
      ) {
        $("#objective").textContent =
          "Return to the glowing shrine in the north.";
        if (hero.position.distanceTo(shrine.position) < 3.8) {
          won = true;
          $("#objective").textContent =
            "Garden restored. Keep wandering, adventurer.";
          toast("✦ Garden restored! Your adventure is complete.");
          burst(relic.getWorldPosition(new THREE.Vector3()), "#ffe890", 70);
          beep(1100, 0.8);
        }
      }
      if (insideCastle) {
        const star = castleRoom.collect(hero.position);
        if (star) {
          burst(star.g.position.clone(), "#ffe399", 12);
          beep(880, 0.2);
          toast(`Hidden star found · ${castleRoom.collected} / 6`);
          $("#castleStars").textContent = castleRoom.collected;
          $("#objective").textContent = castleRoom.objective();
        }
      }
      if (passageCooldown === 0) {
        if (insideCastle && castleRoom.isExit(hero.position))
          useCastlePassage(false);
        else if (
          insideRiver &&
          cableCar.atSummit &&
          !insideCastle &&
          cableCar.summit.castle.isEntrance(hero.position)
        )
          useCastlePassage(true);
        else if (
          insideRiver &&
          !boatTrip.atLagoon &&
          riverside.isExit(hero.position)
        )
          usePassage(false, true);
        else if (
          !insideCave &&
          !insideRiver &&
          riverside.isEntrance(hero.position)
        )
          usePassage(true, true);
        else if (!insideCave && !insideRiver && cave.isEntrance(hero.position))
          usePassage(true);
        else if (insideCave && cave.isExit(hero.position)) usePassage(false);
      }
    }
  }
  updateHudVisibility(isMoving, dt, paused);
  $("#boatAction").hidden =
    insideCastle ||
    !insideRiver ||
    paused ||
    cableCar.riding ||
    cableCar.atSummit ||
    (!boatTrip.rowing && !boatTrip.nearby());
  $("#boatAction").disabled = boatTrip.rowing;
  $("#boatAction").textContent = boatTrip.rowing
    ? "Rowing together…"
    : boatTrip.atLagoon
      ? "Return by boat · T"
      : "Board boat · T";
  $("#cableAction").hidden =
    insideCastle ||
    !insideRiver ||
    !boatTrip.atLagoon ||
    paused ||
    boatTrip.rowing ||
    (!cableCar.riding && !cableCar.nearby());
  $("#cableAction").disabled = cableCar.riding;
  $("#cableAction").textContent = cableCar.riding
    ? "Above the treetops…"
    : cableCar.atSummit
      ? "Return to flower island · C"
      : "Ride to mountain summit · C";
  $("#benchAction").hidden =
    insideCave ||
    insideRiver ||
    paused ||
    benchMoment.seated ||
    !benchMoment.nearby();
  $("#benchStand").hidden = !benchMoment.seated || paused;
  $("#throw").hidden = insideCastle;
  const castleActivity = insideCastle ? castleRoom.nearby(hero.position) : null;
  $("#castleAction").hidden = !castleActivity || paused;
  $("#castleAction").textContent =
    castleActivity?.label ?? "Explore the castle · X";
  $("#castleAction").disabled = castleActivityCooldown > 0;
  lakeside.update(time);
  if (insideCastle) {
    castleRoom.update(time, camera, paused ? 0 : dt);
    $("#caveHint").textContent =
      "Find six hidden stars. Tea, piano and storybook: X nearby. Exit: pink arch to the south.";
  } else if (insideRiver) {
    riverside.update(time);
    cableCar.updateScenery();
    cableCar.updateVisibility(camera, [hero, companion.character], dt);
    const gateX = riverside.returnGate.position.x - hero.position.x,
      gateZ = riverside.returnGate.position.z - hero.position.z;
    const distance = Math.round(Math.hypot(gateX, gateZ));
    const direction = `${Math.abs(gateZ) > 3 ? (gateZ > 0 ? "south" : "north") : ""}${Math.abs(gateX) > 3 ? (gateX > 0 ? "east" : "west") : ""}`;
    $("#caveHint").textContent = cableCar.riding
      ? "Both aboard · Rising above the lake and forest. Camera controls still work."
      : cableCar.atSummit
        ? "Summit castle · Enter through the open arch. Return cable car: beside the castle · C."
        : boatTrip.rowing
          ? "Both aboard · Enjoy the ride. Camera controls still work."
          : boatTrip.atLagoon
            ? "Follow the clear paths through the sunflowers. Cross the bridge for more gems. Cable car: north end of the flower island · C. Return boat: south dock."
            : `Explore the island. A mountain waterfall feeds the river. Boat dock: east bank by the bridge. Return gate: ${distance} m ${direction || "away"}, beside the rainbow lookout.`;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.life -= dt;
    p.v.y -= 8 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += dt * 3;
    p.m.scale.setScalar(Math.min(1, p.life * 3));
    if (p.life < 0) {
      scene.remove(p.m);
      p.m.geometry.dispose();
      particles.splice(i, 1);
    }
  }
  gems.forEach((g) => {
    g.crystal.rotation.y = time;
    g.crystal.position.y = 1 + Math.sin(time * 2 + g.g.position.x) * 0.13;
  });
  relic.rotation.y = time * 0.5;
  relic.position.y = 2.8 + Math.sin(time) * 0.15;
  ring.rotation.y = time * 0.25;
  ring.rotation.z = 0.2;
  desired
    .set(
      Math.sin(yaw) * Math.cos(pitch) * zoom,
      1 + Math.sin(pitch) * zoom,
      Math.cos(yaw) * Math.cos(pitch) * zoom,
    )
    .add(hero.position);
  camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
  camera.lookAt(
    hero.position.x,
    hero.position.y + cameraTargetHeight(),
    hero.position.z,
  );
  hearts.update(paused ? 0 : dt, camera);
  if (insideRiver && !insideCastle)
    riverside.updateVisibility(camera, [hero, companion.character], dt);
  else if (!insideCave && !insideCastle)
    treeVisibility.update(camera, [hero, companion.character], dt);
  sun.position.set(
    hero.position.x - 18,
    hero.position.y + 30,
    hero.position.z + 12,
  );
  sun.target.position.copy(hero.position);
  if (performance.now() > toastUntil) $("#toast").style.opacity = 0;
  const x = hero.position.x,
    z = hero.position.z;
  const region = insideCastle
    ? "The Cloud Castle · Great Room"
    : insideRiver
      ? cableCar.riding
        ? "Above the treetops"
        : cableCar.atSummit
          ? cableCar.summit.castle.inside(hero.position)
            ? "Inside the summit castle"
            : "Summit castle"
          : boatTrip.rowing
            ? "Rowing together"
            : boatTrip.atLagoon
              ? "Lotus Lagoon"
              : riverside.locationAt(hero.position)
      : insideCave
        ? "The Golden Grotto"
        : z < -38
          ? "Treasure cave entrance"
          : z < -20
            ? "The sun shrine"
            : Math.hypot(x - 8, z - 12) < 7
              ? "Sunflower lake"
              : x > 16
                ? "Whispering grove"
                : x < -16
                  ? "Old garden ruins"
                  : z > 16
                    ? "Wildflower trail"
                    : "Petal clearing";
  if ($("#region").firstChild.textContent !== region)
    $("#region").firstChild.textContent = region;
  cave.update(time, camera);
  renderer.render(scene, camera);
}
camera.position
  .set(0, 1 + Math.sin(pitch) * zoom, Math.cos(pitch) * zoom)
  .add(hero.position);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
toast("WASD to move · Drag to look around · Click to throw");
frame();
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: "read_adventure_progress",
          description:
            "Read current garden adventure progress and character position.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute(input) {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("Expected an empty object");
            return {
              location: insideCastle
                ? "castle great room"
                : insideRiver
                  ? cableCar.riding
                    ? "cable car"
                    : cableCar.atSummit
                      ? "mountain summit"
                      : boatTrip.atLagoon
                        ? "lotus lagoon"
                        : "riverside"
                  : insideCave
                    ? "treasure cave"
                    : "garden",
              riversideTreasures: riverCollected,
              lagoonTreasures: boatTrip.lagoon.collected,
              sunStones: collected,
              targetsBroken: score,
              complete: won,
              position: {
                x: Math.round(hero.position.x),
                z: Math.round(hero.position.z),
              },
              objective: $("#objective").textContent,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
  addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
