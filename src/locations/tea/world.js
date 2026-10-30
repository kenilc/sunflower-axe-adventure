import * as THREE from "three";
import { instantiateModel } from "../../assets/models.js";
import { createDioramaBase } from "../../rendering/diorama-base.js";
import { markGlow } from "../../rendering/glow.js";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createRandom } from "../../systems/random.js";
import { createBalloonTrip } from "../mist/balloon-trip.js";
import { createRedPanda } from "./red-panda.js";
import { createToyTrain } from "./toy-train.js";

// Misty Tea Terraces: a round hill of tea on a round board, on a rainy
// afternoon. Terraces climb the hill in rings, each with a red-earth
// walkway along its inner side and a clipped tea hedge along its edge, up to
// a tea house on the top where a red panda keeps the pot warm. Stone stairs
// climb the south and north faces, and a little waterfall steps down the
// east side into a pool. At the foot of the hill a toy train runs round a
// ring of track; the balloon from the hollow lands in a field to the
// southwest, and puddles gather in a lane to the south.
//
// Angles round the hill are measured from south (+z, towards the camera)
// turning east (+x), so a point is at (r sin a, r cos a).
export const TEA_SIZE = 34;
const EDGE = TEA_SIZE - 1.4;
// Each terrace's tread runs from `inner` to `outer` at `height`. The
// walkway is the inner part up to `hedge`; tea bushes fill the rest. Banks
// of dry-stone wall slope between one tread and the next.
export const TERRACES = [
  { inner: 0, outer: 6, height: 5, hedge: 5.3 },
  { inner: 7, outer: 10.5, height: 3.75, hedge: 9 },
  { inner: 11.5, outer: 15, height: 2.5, hedge: 13.4 },
  { inner: 16, outer: 19.5, height: 1.25, hedge: 17.9 },
];
const FOOT = 20.5;
// Straight stairs up the banks: along the ray at `angle`, `half` wide.
const STAIRS = [
  { angle: 0, half: 1.3 },
  { angle: Math.PI, half: 1.1 },
];
export const TRACK = { r: 24, gauge: 0.9 };
// Tea rows on the ground to the north, between which the friends can walk.
const ROWS = { radii: [26.8, 29.6, 32.4], half: 0.6, from: 2.25, to: 4.05 };
const FALL = { angle: 1.02, half: 0.45 };
const POOL = { r: 1.35 };
const polar = (r, a) => ({ x: Math.sin(a) * r, z: Math.cos(a) * r });
const POOL_AT = polar(21.7, FALL.angle);
const HALT = { angle: 1.78, r: 26.1 };
const BALLOON_AT = polar(28.4, -1.2);
// The puddles, as ellipses on the ground or a walkway. The first is the
// big one in the lane, for jumping in.
export const PUDDLES = [
  { ...polar(28, 0.42), rx: 1.6, rz: 1.15, turn: 0.4 },
  { ...polar(30.2, 0.2), rx: 0.8, rz: 0.55, turn: 1.1 },
  { ...polar(26.4, 0.62), rx: 0.95, rz: 0.6, turn: -0.3 },
  { ...polar(29.5, -0.25), rx: 0.7, rz: 0.5, turn: 0.2 },
  { ...polar(26.3, -1.35), rx: 0.9, rz: 0.6, turn: 0.9 },
  { ...polar(17, 0.75), rx: 0.75, rz: 0.45, turn: 0.75 },
  { ...polar(12.3, -0.9), rx: 0.7, rz: 0.45, turn: -0.9 },
  { ...polar(7.9, 2.3), rx: 0.6, rz: 0.4, turn: 2.3 },
];
// The tea house on the top, facing south down the main stair.
export const TEA_HOUSE = {
  x: 0,
  z: -0.6,
  halfWidth: 2.9,
  back: -2.6,
  front: 2,
  eaves: 2.9,
};

// The ground's height: flat treads with sloping banks between.
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  if (r >= FOOT) return 0;
  for (let k = 0; k < TERRACES.length; k++) {
    const tread = TERRACES[k];
    if (r <= tread.outer) return tread.height;
    const next = TERRACES[k + 1];
    const inner = next?.inner ?? FOOT,
      below = next?.height ?? 0;
    if (r < inner)
      return (
        tread.height -
        ((r - tread.outer) / (inner - tread.outer)) * (tread.height - below)
      );
  }
  return 0;
}
// Which stair, if any, a point stands on.
function stairAt(x, z, margin = 0) {
  const r = Math.hypot(x, z);
  if (r < TERRACES[0].hedge - 0.6 || r > FOOT + 0.6) return null;
  return (
    STAIRS.find(({ angle, half }) => {
      const along = x * Math.sin(angle) + z * Math.cos(angle),
        across = x * Math.cos(angle) - z * Math.sin(angle);
      return along > 0 && Math.abs(across) < half + margin;
    }) ?? null
  );
}
const angleOf = (x, z) => Math.atan2(x, z);
// The shortest turn between two angles.
const turnBetween = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function inRows(x, z, margin = 0) {
  const a = (angleOf(x, z) + Math.PI * 2) % (Math.PI * 2);
  if (a < ROWS.from || a > ROWS.to) return false;
  const r = Math.hypot(x, z);
  return ROWS.radii.some((row) => Math.abs(r - row) < ROWS.half + margin);
}
const inPool = (x, z, margin = 0) =>
  Math.hypot(x - POOL_AT.x, z - POOL_AT.z) < POOL.r + margin;
// Where the friends can stand: the top, the terrace walkways, the stairs,
// and the ground round the foot, between the tea rows.
export function walkable(x, z) {
  const r = Math.hypot(x, z);
  if (r > EDGE) return false;
  if (stairAt(x, z)) return true;
  if (r < TERRACES[0].hedge - 0.25) return true;
  for (const tread of TERRACES.slice(1))
    if (r > tread.inner + 0.3 && r < tread.hedge - 0.3) return true;
  if (r < FOOT + 0.3) return false;
  return !inRows(x, z, 0.15) && !inPool(x, z, 0.3);
}

export function createTeaWorld(context) {
  const group = new THREE.Group();
  group.name = "tea-terraces";
  context.scene.add(group);
  const helpers = createMeshFactory(group);
  const { mesh, box, cyl, ball } = helpers;
  const rand = createRandom(5207);
  const blockers = [];

  createDioramaBase({
    parent: group,
    mesh,
    size: TEA_SIZE,
    top: -0.03,
    grass: "#5f8f4e",
    soil: "#9a5a3c",
    stone: "#6f7570",
    rock: "#59524e",
    seed: 5207,
  });

  // The hill, turned on a lathe: grass under the hedges, red earth on the
  // walkways, and wet slate on the banks. It is ground, so it never fades.
  const hill = new THREE.Group();
  hill.name = "tea-hill";
  hill.userData.keepSolid = true;
  group.add(hill);
  function ring(points, color) {
    const part = mesh(
      new THREE.LatheGeometry(
        points.map(([r, y]) => new THREE.Vector2(r, y)),
        96,
      ),
      color,
      0,
      0,
      0,
      hill,
    );
    part.material.side = THREE.DoubleSide;
    return part;
  }
  const earth = "#a5643f",
    slate = "#6f7570",
    moss = "#5f7a52",
    leafGround = "#557f45";
  TERRACES.forEach((tread, k) => {
    const next = TERRACES[k + 1];
    const y = tread.height;
    if (k === 0)
      ring(
        [
          [0.01, y],
          [tread.outer, y],
        ],
        "#7d9a5c",
      );
    else {
      ring(
        [
          [tread.inner, y],
          [tread.hedge, y],
        ],
        earth,
      );
      ring(
        [
          [tread.hedge, y],
          [tread.outer, y],
        ],
        leafGround,
      );
    }
    ring(
      [
        [tread.outer, y],
        [next?.inner ?? FOOT, next?.height ?? -0.03],
      ],
      moss,
    );
  });
  // Flat slate stones set in the mossy banks, like old dry-stone walls.
  const stones = [];
  TERRACES.forEach((tread, k) => {
    const next = TERRACES[k + 1];
    const r0 = tread.outer,
      r1 = next?.inner ?? FOOT,
      y0 = tread.height,
      y1 = next?.height ?? 0;
    const rows = 2;
    for (let row = 0; row < rows; row++) {
      const t = (row + 0.5) / rows;
      const r = r0 + (r1 - r0) * t,
        y = y0 + (y1 - y0) * t;
      const count = Math.floor((Math.PI * 2 * r) / 0.75);
      for (let i = 0; i < count; i++) {
        const a = ((i + (row % 2) * 0.5) / count) * Math.PI * 2;
        const { x, z } = polar(r, a);
        if (
          rand() < 0.3 ||
          stairAt(x, z, 0.3) ||
          Math.abs(turnBetween(a, FALL.angle)) * r < 0.8
        )
          continue;
        stones.push({ x, y, z, a, tilt: Math.atan2(r1 - r0, y0 - y1) });
      }
    }
  });
  const placed = new THREE.Object3D();
  const stoneMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.66, 0.34, 0.12),
    helpers.mat("#868c86"),
    stones.length,
  );
  stones.forEach(({ x, y, z, a, tilt }, i) => {
    placed.position.set(x, y, z);
    placed.rotation.set(tilt, a, 0, "YXZ");
    placed.scale.set(0.8 + rand() * 0.45, 0.8 + rand() * 0.4, 1);
    placed.updateMatrix();
    stoneMesh.setMatrixAt(i, placed.matrix);
    stoneMesh.setColorAt(
      i,
      new THREE.Color(["#868c86", "#7a8079", "#959a91", "#727d6c"][i % 4]),
    );
  });
  stoneMesh.receiveShadow = true;
  hill.add(stoneMesh);

  // The stairs: stone steps down each bank, flagstones across the walkways
  // and hedges, and a cheek wall on each side.
  const stepColor = "#a39d92";
  for (const { angle, half } of STAIRS) {
    const stair = new THREE.Group();
    stair.rotation.y = angle;
    stair.userData.keepSolid = true;
    group.add(stair);
    TERRACES.forEach((tread, k) => {
      const next = TERRACES[k + 1];
      const r0 = tread.outer,
        r1 = next?.inner ?? FOOT,
        y0 = tread.height,
        y1 = next?.height ?? 0;
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const top = y0 - ((i + 0.5) / steps) * (y0 - y1);
        const depth = (r1 - r0) / steps;
        const step = box(
          half * 2,
          top - y1 + 0.06,
          depth + 0.02,
          stepColor,
          0,
          (top + y1) / 2,
          r0 + (i + 0.5) * depth,
          stair,
        );
        step.castShadow = false;
      }
      for (const side of [-1, 1]) {
        const cheek = box(
          0.32,
          0.5,
          Math.hypot(r1 - r0, y0 - y1) + 0.3,
          slate,
          side * (half + 0.16),
          (y0 + y1) / 2 + 0.2,
          (r0 + r1) / 2,
          stair,
        );
        cheek.rotation.x = Math.atan2(y0 - y1, r1 - r0);
      }
      // Flagstones across the tread below this bank.
      if (!next) return;
      for (let r = next.inner + 0.3; r < next.outer; r += 0.75) {
        const flag = box(
          half * 2 - 0.15,
          0.05,
          0.62,
          rand() < 0.5 ? "#b2ab9f" : "#a39d92",
          0,
          next.height + 0.02,
          r,
          stair,
        );
        flag.castShadow = false;
      }
    });
  }

  // Tea bushes: rounded clipped mounds along each terrace's edge and in
  // rows on the ground, with pale new shoots on top. The shoots are what
  // the friends pick.
  const bushes = [];
  const shoots = [];
  function hedge(r, y, from = 0, to = Math.PI * 2, scale = 1) {
    const count = Math.floor(((to - from) * r) / 1.05);
    for (let i = 0; i < count; i++) {
      const a = from + ((i + 0.5) / count) * (to - from);
      const { x, z } = polar(r, a);
      if (stairAt(x, z, 0.75)) continue;
      if (Math.abs(turnBetween(a, FALL.angle)) * r < FALL.half + 0.7) continue;
      const size = (0.86 + rand() * 0.14) * scale;
      bushes.push({ x, y, z, size, turn: rand() * Math.PI });
      for (let k = 0; k < 3; k++) {
        const along = (k - 1) * 0.36 + (rand() - 0.5) * 0.1,
          out = (rand() - 0.5) * 0.5;
        shoots.push({
          x: x + Math.cos(a) * along + Math.sin(a) * out,
          y: y + size * 0.8,
          z: z - Math.sin(a) * along + Math.cos(a) * out,
          picked: false,
        });
      }
    }
  }
  for (const tread of TERRACES.slice(1))
    hedge((tread.hedge + tread.outer) / 2, tread.height);
  for (const r of ROWS.radii) hedge(r, 0, ROWS.from, ROWS.to, 0.8);
  const bushMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    helpers.mat("#4f8a3e"),
    bushes.length,
  );
  const greens = ["#4f8a3e", "#5b9746", "#467f3a", "#56913f"];
  bushes.forEach(({ x, y, z, size, turn }, i) => {
    placed.position.set(x, y + size * 0.22, z);
    placed.rotation.set(0, turn, 0);
    placed.scale.set(size, size * 0.62, size);
    placed.updateMatrix();
    bushMesh.setMatrixAt(i, placed.matrix);
    bushMesh.setColorAt(i, new THREE.Color(greens[i % greens.length]));
  });
  bushMesh.castShadow = bushMesh.receiveShadow = true;
  group.add(bushMesh);
  const shootMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.11, 0),
    helpers.mat("#a5d46a"),
    shoots.length,
  );
  function placeShoot(i) {
    const shoot = shoots[i];
    placed.position.set(shoot.x, shoot.y, shoot.z);
    placed.rotation.set(0, i, 0);
    placed.scale.set(1, shoot.picked ? 0 : 1.6, 1);
    placed.updateMatrix();
    shootMesh.setMatrixAt(i, placed.matrix);
  }
  shoots.forEach((_, i) => placeShoot(i));
  shootMesh.castShadow = false;
  group.add(shootMesh);

  // Low stone parapet round the top, open where the stairs arrive.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const { x, z } = polar(5.75, a);
    if (stairAt(x, z, 0.4)) continue;
    const cap = box(0.95, 0.45, 0.42, i % 2 ? "#8b9089" : "#7e847d", x, 5.2, z);
    cap.rotation.y = a;
  }

  // Shade trees: tall pale trunks with layered, airy crowns, standing in
  // the hedges and round the foot of the hill.
  for (const [r, a] of [
    [9.75, -1.25],
    [9.75, 2.85],
    [14.2, -2.55],
    [14.2, 1.7],
    [18.7, 2.05],
    [18.7, 0.5],
    [27.5, -1.75],
    [21.6, 2.65],
    [21.6, -2.25],
    [30.5, 1.05],
  ]) {
    const { x, z } = polar(r, a);
    const y = heightAt(x, z);
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    tree.rotation.y = rand() * Math.PI;
    group.add(tree);
    const tall = 5 + rand() * 1.8;
    cyl(0.14, 0.22, tall, "#b9b2a4", 0, tall / 2, 0, tree, 7);
    for (let k = 0; k < 6; k++) {
      const crown = ball(
        0.9 + rand() * 0.5,
        ["#6f9a6a", "#628f60", "#78a370"][k % 3],
        Math.sin(k * 2.4) * (k ? 0.9 : 0),
        tall - 0.6 + (k % 3) * 0.45,
        Math.cos(k * 2.4) * (k ? 0.9 : 0),
        tree,
      );
      crown.scale.y = 0.7;
    }
    blockers.push({ x, z, r: 0.4 });
  }

  // The waterfall: a stream spills off the top and steps down each bank,
  // runs across the treads under little plank bridges, and fills a pool at
  // the foot of the hill.
  const water = new THREE.MeshStandardMaterial({
    color: "#86c3d8",
    emissive: "#4a9cba",
    emissiveIntensity: 0.4,
    roughness: 0.2,
    transparent: true,
    opacity: 0.88,
  });
  const fall = new THREE.Group();
  fall.rotation.y = FALL.angle;
  group.add(fall);
  const foams = [];
  const foamMaterial = new THREE.MeshStandardMaterial({
    color: "#f4fbfc",
    roughness: 0.6,
    transparent: true,
    opacity: 0.85,
  });
  TERRACES.forEach((tread, k) => {
    const next = TERRACES[k + 1];
    const r0 = tread.outer - (k ? 0 : 0.4),
      r1 = next?.inner ?? FOOT,
      y0 = tread.height,
      y1 = next?.height ?? 0;
    const length = Math.hypot(r1 - r0, y0 - y1);
    const sheet = box(
      FALL.half * 2,
      0.06,
      length + 0.1,
      water,
      0,
      (y0 + y1) / 2 + 0.06,
      (r0 + r1) / 2,
      fall,
    );
    sheet.rotation.x = Math.atan2(y0 - y1, r1 - r0);
    sheet.castShadow = false;
    const foam = mesh(
      new THREE.IcosahedronGeometry(0.42, 1),
      foamMaterial,
      0,
      y1 + 0.12,
      r1 + 0.15,
      fall,
    );
    foam.scale.set(1.3, 0.45, 0.8);
    foam.castShadow = false;
    foams.push(foam);
    if (!next) return;
    const runnel = box(
      FALL.half * 2,
      0.05,
      next.outer - next.inner,
      water,
      0,
      next.height + 0.02,
      (next.inner + next.outer) / 2,
      fall,
    );
    runnel.castShadow = false;
    // A plank bridge where the walkway crosses.
    const mid = (next.inner + next.hedge) / 2;
    for (let p = -2; p <= 2; p++) {
      const plank = box(
        0.32,
        0.07,
        FALL.half * 2 + 0.6,
        "#9a7558",
        0,
        next.height + 0.07,
        mid + p * 0.36,
        fall,
      );
      plank.rotation.y = Math.PI / 2;
      plank.castShadow = false;
    }
  });
  const pool = cyl(
    POOL.r,
    POOL.r,
    0.05,
    water,
    POOL_AT.x,
    0.02,
    POOL_AT.z,
    group,
    28,
  );
  pool.castShadow = false;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rock = ball(
      0.3 + rand() * 0.2,
      i % 3 ? "#7a807a" : "#8d928a",
      POOL_AT.x + Math.sin(a) * (POOL.r + 0.15),
      0.08,
      POOL_AT.z + Math.cos(a) * (POOL.r + 0.15),
    );
    rock.scale.y = 0.55;
  }

  // The toy train's ring of track: gravel, sleepers and two rails.
  const ballast = cyl(
    TRACK.r + 0.9,
    TRACK.r + 0.9,
    0.03,
    "#8e857b",
    0,
    0.005,
    0,
    group,
    120,
  );
  ballast.castShadow = false;
  const verge = cyl(
    TRACK.r - 0.9,
    TRACK.r - 0.9,
    0.04,
    "#5f8f4e",
    0,
    0.01,
    0,
    group,
    120,
  );
  verge.castShadow = false;
  const sleeperCount = Math.floor((Math.PI * 2 * TRACK.r) / 0.7);
  const sleeperMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.4, 0.07, 0.24),
    helpers.mat("#5c4637"),
    sleeperCount,
  );
  for (let i = 0; i < sleeperCount; i++) {
    const a = (i / sleeperCount) * Math.PI * 2;
    const { x, z } = polar(TRACK.r, a);
    placed.position.set(x, 0.05, z);
    placed.rotation.set(0, a, 0);
    placed.scale.set(1, 1, 1);
    placed.updateMatrix();
    sleeperMesh.setMatrixAt(i, placed.matrix);
  }
  sleeperMesh.receiveShadow = true;
  group.add(sleeperMesh);
  for (const side of [-1, 1]) {
    const rail = mesh(
      new THREE.TorusGeometry(TRACK.r + (side * TRACK.gauge) / 2, 0.05, 4, 160),
      "#9aa0a6",
      0,
      0.11,
      0,
    );
    rail.rotation.x = Math.PI / 2;
    rail.castShadow = false;
  }

  // The halt: a short platform with a little shelter, a bench and a lamp.
  const halt = new THREE.Group();
  const haltAt = polar(HALT.r, HALT.angle);
  halt.position.set(haltAt.x, 0, haltAt.z);
  halt.rotation.y = HALT.angle;
  group.add(halt);
  box(5.6, 0.08, 1.7, "#b2ab9f", 0, 0.04, 0, halt).castShadow = false;
  box(5.6, 0.1, 0.12, "#f2c94c", 0, 0.09, -0.8, halt).castShadow = false;
  for (const x of [-1.4, 1.4])
    for (const z of [0.6, -0.3])
      cyl(0.07, 0.07, 2.6, "#6b4f3a", x, 1.3, z, halt, 6);
  const shelter = box(3.4, 0.12, 1.7, "#c8573f", 0, 2.66, 0.12, halt);
  shelter.rotation.x = -0.12;
  box(1.6, 0.08, 0.45, "#9a7558", 0, 0.62, 0.55, halt);
  for (const x of [-0.65, 0.65])
    box(0.08, 0.6, 0.4, "#6b4f3a", x, 0.3, 0.55, halt);
  box(1.6, 0.4, 0.06, "#9a7558", 0, 0.95, 0.77, halt);
  cyl(0.06, 0.08, 2.9, "#3a3f46", 2.4, 1.45, 0.5, halt, 6);
  const lampGlow = new THREE.MeshStandardMaterial({
    color: "#ffe2a8",
    emissive: "#ffd28a",
    emissiveIntensity: 1.2,
    roughness: 0.5,
  });
  const lamp = mesh(
    new THREE.IcosahedronGeometry(0.2, 2),
    lampGlow,
    2.4,
    2.95,
    0.5,
    halt,
  );
  lamp.castShadow = false;
  markGlow(lamp);
  // A sign on two posts: a little engine painted on a cream board.
  for (const x of [-2.2, -1.2])
    cyl(0.05, 0.05, 1.6, "#6b4f3a", x, 0.8, 0.7, halt, 6);
  box(1.3, 0.55, 0.06, "#f4efe2", -1.7, 1.45, 0.72, halt);
  box(0.5, 0.22, 0.04, "#3b6fb0", -1.75, 1.42, 0.76, halt);
  cyl(0.05, 0.06, 0.16, "#3b6fb0", -1.58, 1.6, 0.76, halt, 6);
  for (const x of [-1.9, -1.6]) {
    const wheel = cyl(0.07, 0.07, 0.03, "#c8573f", x, 1.29, 0.78, halt, 10);
    wheel.rotation.x = Math.PI / 2;
  }
  for (const x of [-1.4, 1.4])
    blockers.push({ ...localToWorld(halt, x, 0.6), r: 0.2 });
  blockers.push({ ...localToWorld(halt, 0, 0.6), r: 0.35 });
  blockers.push({ ...localToWorld(halt, 2.4, 0.5), r: 0.2 });
  blockers.push({ ...localToWorld(halt, -1.7, 0.7), r: 0.55 });
  const boarding = localToWorld(halt, 0, -0.2);
  const trainSpot = new THREE.Vector3(boarding.x, 0, boarding.z);
  const train = createToyTrain(context, {
    parent: group,
    radius: TRACK.r,
    angle: HALT.angle,
    helpers,
  });
  blockers.push(...train.blockers);

  // The tea house: an open-fronted wooden room with a red tin roof, a
  // round window at the back, a bench and a low table looking out over the
  // valley, and a stove where the red panda keeps the kettle.
  const house = new THREE.Group();
  house.name = "tea-house";
  house.position.set(TEA_HOUSE.x, TERRACES[0].height, TEA_HOUSE.z);
  group.add(house);
  const wood = "#9a6b48",
    dark = "#6b4a36",
    cream = "#f1e6cf",
    tin = "#b5523b";
  const { halfWidth: hw, back, front } = TEA_HOUSE;
  box(
    hw * 2 + 0.3,
    0.12,
    front - back + 0.3,
    "#b08560",
    0,
    0.06,
    (front + back) / 2,
    house,
  ).castShadow = false;
  // The back wall with a round window, the side walls to the sill, and
  // posts holding up the roof.
  box(hw * 2, 1.15, 0.18, cream, 0, 0.6, back, house);
  box(hw * 2, 0.75, 0.18, cream, 0, 2.6, back, house);
  for (const side of [-1, 1]) {
    box(
      hw - 0.75,
      1.0,
      0.18,
      cream,
      (side * (hw + 0.75)) / 2,
      1.7,
      back,
      house,
    );
    box(
      0.18,
      1.0,
      front - back - 0.6,
      cream,
      side * hw,
      0.5,
      (front + back) / 2 - 0.3,
      house,
    );
    box(
      0.24,
      0.1,
      front - back - 0.6,
      wood,
      side * hw,
      1.05,
      (front + back) / 2 - 0.3,
      house,
    );
  }
  const window = mesh(
    new THREE.TorusGeometry(0.72, 0.09, 8, 28),
    wood,
    0,
    1.7,
    back + 0.05,
    house,
  );
  window.castShadow = false;
  for (const angle of [0, Math.PI / 2])
    box(0.06, 1.44, 0.05, wood, 0, 1.7, back + 0.05, house).rotation.z = angle;
  for (const [x, z] of [
    [-hw, back],
    [hw, back],
    [-hw, front],
    [hw, front],
    [-hw, 0],
    [hw, 0],
  ])
    cyl(0.1, 0.12, 2.95, dark, x, 1.48, z, house, 8);
  box(hw * 2 + 0.3, 0.18, 0.2, dark, 0, 2.9, front, house);
  // A hipped roof of red tin, flaring a little at the eaves, with a
  // chimney for the stove.
  const roofDepth = front - back + 1.4,
    roofWidth = hw * 2 + 1.4;
  const roof = mesh(
    new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true),
    tin,
    0,
    3.75,
    (front + back) / 2,
    house,
  );
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(roofWidth, 1.7, roofDepth);
  roof.material = roof.material.clone();
  roof.material.side = THREE.DoubleSide;
  const eaves = box(
    roofWidth + 0.1,
    0.1,
    roofDepth + 0.1,
    "#f1e6cf",
    0,
    2.92,
    (front + back) / 2,
    house,
  );
  eaves.scale.set(1, 1, 1);
  cyl(0.18, 0.2, 1.4, "#7a807a", 1.6, 3.9, back + 0.6, house, 8);
  ball(0.16, "#e2c46a", 0, 4.62, (front + back) / 2, house);
  // Inside: the bench along the front, the low table before it, cushions,
  // and the stove and shelf at the back.
  const seat = new THREE.Vector3(0, 0, 0.35);
  box(hw * 2 - 0.15, 0.12, 0.6, wood, seat.x, 0.62, seat.z, house);
  box(hw * 2 - 0.15, 0.5, 0.12, wood, seat.x, 0.95, seat.z - 0.32, house);
  for (const x of [-2.6, -1.15, 1.15, 2.6])
    box(0.12, 0.6, 0.5, dark, x, 0.3, seat.z, house);
  for (const [x, color] of [
    [-0.62, "#e2a24a"],
    [0.62, "#7fa6c8"],
  ]) {
    const cushion = box(0.8, 0.12, 0.5, color, x, 0.73, seat.z + 0.02, house);
    cushion.castShadow = false;
  }
  const table = new THREE.Vector3(0, 0, 1.25);
  box(1.7, 0.1, 0.75, "#b5835a", table.x, 0.9, table.z, house);
  for (const [dx, dz] of [
    [-0.7, -0.28],
    [0.7, -0.28],
    [-0.7, 0.28],
    [0.7, 0.28],
  ])
    box(0.09, 0.85, 0.09, dark, table.x + dx, 0.43, table.z + dz, house);
  const cups = [-0.45, 0.45].map((x) => {
    const cup = new THREE.Group();
    cup.position.set(x, 0.95, table.z + 0.05);
    house.add(cup);
    cyl(0.1, 0.08, 0.14, "#f4efe2", 0, 0.07, 0, cup, 12);
    const tea = cyl(0.085, 0.085, 0.02, "#b9733a", 0, 0.12, 0, cup, 12);
    tea.visible = false;
    cyl(0.15, 0.15, 0.02, "#f4efe2", 0, 0.005, 0, cup, 14).castShadow = false;
    return { cup, tea };
  });
  // A little plate of biscuits between the cups.
  cyl(0.2, 0.2, 0.03, "#7fa6c8", 0, 0.97, table.z - 0.08, house, 14);
  for (let i = 0; i < 4; i++)
    cyl(
      0.07,
      0.07,
      0.03,
      "#d9a05a",
      Math.sin(i * 1.6) * 0.09,
      1.0 + i * 0.01,
      table.z - 0.08 + Math.cos(i * 1.6) * 0.09,
      house,
      10,
    );
  box(0.9, 0.9, 0.7, "#3f4148", 1.85, 0.45, back + 0.6, house);
  cyl(0.24, 0.26, 0.28, "#c9a24a", 1.85, 1.04, back + 0.6, house, 12);
  box(1.6, 0.08, 0.3, wood, -1.6, 1.55, back + 0.25, house);
  for (const [x, color] of [
    [-2.1, "#c8573f"],
    [-1.75, "#3f8f8a"],
    [-1.4, "#e2c46a"],
    [-1.05, "#f4efe2"],
  ])
    cyl(0.12, 0.12, 0.3, color, x, 1.74, back + 0.25, house, 10);
  const glowingLamp = mesh(
    new THREE.IcosahedronGeometry(0.2, 2),
    lampGlow,
    0,
    2.55,
    0.6,
    house,
  );
  glowingLamp.castShadow = false;
  // Bunting from the eaves to two posts at the head of the stair.
  const flags = [];
  const flagColors = ["#e2453c", "#f2c94c", "#3f8f8a", "#f4efe2", "#5b7fa8"];
  const flagShape = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.16, 0, 0),
    new THREE.Vector3(0.16, 0, 0),
    new THREE.Vector3(0, -0.34, 0),
  ]);
  flagShape.computeVertexNormals();
  for (const side of [-1, 1]) {
    const post = new THREE.Vector3(side * 1.9, 0, 5.35);
    cyl(0.07, 0.08, 2.4, dark, post.x, 6.2, post.z, group, 6);
    blockers.push({ x: post.x, z: post.z, r: 0.18 });
    const from = new THREE.Vector3(
      side * hw,
      TERRACES[0].height + 2.8,
      TEA_HOUSE.z + front,
    );
    const to = new THREE.Vector3(post.x, 7.35, post.z);
    const count = 8;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const point = from.clone().lerp(to, t);
      point.y -= Math.sin(t * Math.PI) * 0.45;
      if (i < count) {
        const next = from.clone().lerp(to, (i + 1) / count);
        next.y -= Math.sin(((i + 1) / count) * Math.PI) * 0.45;
        const cord = cyl(
          0.012,
          0.012,
          point.distanceTo(next),
          "#f4efe2",
          0,
          0,
          0,
          group,
          4,
        );
        cord.position.copy(point).lerp(next, 0.5);
        cord.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          next.clone().sub(point).normalize(),
        );
        cord.castShadow = false;
      }
      if (i === 0 || i === count) continue;
      const flag = new THREE.Mesh(
        flagShape,
        new THREE.MeshStandardMaterial({
          color: flagColors[(i + (side > 0 ? 2 : 0)) % flagColors.length],
          roughness: 0.8,
          side: THREE.DoubleSide,
        }),
      );
      flag.position.copy(point);
      flag.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2;
      group.add(flag);
      flags.push(flag);
    }
  }
  // The tea house walls, as circles along them, and the stove and bench.
  const toWorld = (x, z) => ({ x: TEA_HOUSE.x + x, z: TEA_HOUSE.z + z });
  for (let x = -hw; x <= hw + 0.01; x += 0.55)
    blockers.push({ ...toWorld(x, back), r: 0.3 });
  for (const side of [-1, 1])
    for (let z = back; z <= front - 0.4; z += 0.55)
      blockers.push({ ...toWorld(side * hw, z), r: 0.3 });
  for (const side of [-1, 1])
    blockers.push({ ...toWorld(side * hw, front), r: 0.2 });
  blockers.push({ ...toWorld(1.85, back + 0.6), r: 0.6 });
  for (const x of [-0.8, 0, 0.8])
    blockers.push({ ...toWorld(x, table.z), r: 0.42 });
  // The bench runs on to the side walls, so the back, with the stove and
  // shelf, stays out of the way.
  for (const x of [-2.4, -1.8, -0.9, 0, 0.9, 1.8, 2.4])
    blockers.push({ ...toWorld(x, seat.z - 0.1), r: 0.36 });
  const teaSpot = new THREE.Vector3(
    TEA_HOUSE.x,
    TERRACES[0].height,
    TEA_HOUSE.z + table.z + 0.9,
  );
  const panda = createRedPanda(house, {
    position: [1.75, 0, 1.0],
    heading: -Math.PI / 2,
  });
  blockers.push({ ...toWorld(1.75, 1.0), r: 0.45 });

  // The pickers' corner on the lowest terrace: two baskets and a bench
  // against the bank.
  const corner = polar(16.45, -0.62);
  const bench = new THREE.Group();
  bench.position.set(corner.x, TERRACES[3].height, corner.z);
  bench.rotation.y = -0.62;
  group.add(bench);
  box(1.6, 0.08, 0.42, "#9a7558", 0, 0.5, 0, bench);
  for (const x of [-0.65, 0.65])
    box(0.08, 0.5, 0.36, "#6b4f3a", x, 0.25, 0, bench);
  for (const x of [-0.42, 0.42]) {
    const basket = cyl(0.3, 0.2, 0.5, "#c8955a", x, 0.79, 0, bench, 12);
    basket.rotation.z = x * 0.15;
    cyl(0.31, 0.31, 0.05, "#a8714a", x, 1.0, 0, bench, 12).castShadow = false;
  }
  blockers.push({ x: corner.x, z: corner.z, r: 0.7 });

  // Snails out in the rain, creeping along the walls.
  const snails = [];
  for (let i = 0; i < 6; i++) {
    const tread = TERRACES[1 + (i % 3)];
    const snail = new THREE.Group();
    group.add(snail);
    const shell = mesh(
      new THREE.TorusGeometry(0.1, 0.06, 6, 12),
      ["#c98f5a", "#d9a86a", "#b97a4a"][i % 3],
      0,
      0.14,
      0,
      snail,
    );
    shell.castShadow = false;
    const foot = mesh(
      new THREE.CapsuleGeometry(0.05, 0.22, 3, 6),
      "#d8cbb5",
      0,
      0.05,
      0,
      snail,
    );
    foot.rotation.x = Math.PI / 2;
    foot.castShadow = false;
    for (const side of [-1, 1]) {
      const stalk = cyl(
        0.012,
        0.012,
        0.12,
        "#d8cbb5",
        side * 0.03,
        0.12,
        0.15,
        snail,
        4,
      );
      stalk.rotation.x = 0.4;
      ball(0.022, "#33241f", side * 0.03, 0.18, 0.18, snail).castShadow = false;
    }
    snails.push({
      snail,
      r: tread.outer + 0.15,
      y: tread.height - 0.2,
      angle: rand() * Math.PI * 2,
      speed: (0.02 + rand() * 0.015) * (i % 2 ? 1 : -1),
    });
  }

  // Wildflowers and stones in the grass round the foot.
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2,
      r = FOOT + 1 + rand() * (EDGE - FOOT - 1.5);
    const { x, z } = polar(r, a);
    if (
      Math.abs(r - TRACK.r) < 1.4 ||
      inRows(x, z, 0.6) ||
      inPool(x, z, 0.8) ||
      PUDDLES.some((p) => Math.hypot(x - p.x, z - p.z) < p.rx + 0.6) ||
      Math.hypot(x - BALLOON_AT.x, z - BALLOON_AT.z) < 3.2 ||
      Math.hypot(x - haltAt.x, z - haltAt.z) < 3.5
    )
      continue;
    if (i % 4 === 0) {
      ball(0.22 + rand() * 0.15, "#7d827c", x, 0.05, z).scale.y = 0.5;
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const fx = x + Math.sin(k * 2.1) * 0.18,
        fz = z + Math.cos(k * 2.1) * 0.18;
      cyl(0.015, 0.015, 0.36, "#5f8f4e", fx, 0.18, fz, group, 4).castShadow =
        false;
      ball(
        0.075,
        ["#f4efe2", "#f2c94c", "#e8a0b8", "#b9a6dc"][(i + k) % 4],
        fx,
        0.38,
        fz,
      ).castShadow = false;
    }
  }

  // Puddles: glossy pools of rainwater on the ground and the walkways.
  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: "#8ea6b0",
    roughness: 0.08,
    metalness: 0.25,
  });
  for (const puddle of PUDDLES) {
    puddle.y = heightAt(puddle.x, puddle.z);
    const pool = mesh(
      new THREE.CircleGeometry(1, 24),
      puddleMaterial,
      puddle.x,
      puddle.y + 0.025,
      puddle.z,
    );
    pool.rotation.set(-Math.PI / 2, 0, puddle.turn);
    pool.scale.set(puddle.rx, puddle.rz, 1);
    pool.castShadow = false;
  }

  // The meadow where the balloon comes down from the hollow.
  const balloon = instantiateModel(context.models.balloon);
  balloon.position.set(BALLOON_AT.x, 0, BALLOON_AT.z);
  balloon.rotation.y = -1.2 + Math.PI;
  group.add(balloon);
  const envelope = balloon.getObjectByName("envelope");
  blockers.push({ x: BALLOON_AT.x, z: BALLOON_AT.z, r: 1.3 });
  const trip = createBalloonTrip(context, { balloon, destination: "mist" });
  const landing = polar(26.6, -1.2);
  const balloonSpot = new THREE.Vector3(landing.x, 0, landing.z);

  // Low clouds that drift round the hill in the rain and thin out after.
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: "#eef3ef",
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const cloud = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 2),
      cloudMaterial,
    );
    cloud.scale.set(3 + rand() * 2.5, 0.7 + rand() * 0.5, 2 + rand() * 1.5);
    group.add(cloud);
    clouds.push({
      cloud,
      angle: (i / 16) * Math.PI * 2 + rand() * 0.3,
      r: 13 + rand() * 14,
      y: 2.5 + rand() * 4,
      speed: 0.02 + rand() * 0.02,
    });
  }

  const nearBy = (position, spot, radius) =>
    Math.hypot(position.x - spot.x, position.z - spot.z) < radius;
  // The hedge nearest a point within reach, as its radius and the side
  // (+1 outward, -1 inward) the friends would face to pick from it.
  function hedgeNear(position) {
    if (stairAt(position.x, position.z, 0.5)) return null;
    const r = Math.hypot(position.x, position.z);
    for (const tread of TERRACES.slice(1)) {
      if (
        Math.abs(position.y - tread.height) < 0.2 &&
        r > tread.hedge - 1.2 &&
        r < tread.hedge
      )
        return { r: tread.hedge, y: tread.height, side: 1 };
    }
    if (r < FOOT || inPool(position.x, position.z, 1)) return null;
    const a = (angleOf(position.x, position.z) + Math.PI * 2) % (Math.PI * 2);
    if (a < ROWS.from + 0.04 || a > ROWS.to - 0.04) return null;
    for (const row of ROWS.radii) {
      const gap = r - row;
      if (Math.abs(gap) < ROWS.half + 1.2)
        return {
          r: row + Math.sign(gap) * ROWS.half,
          y: 0,
          side: -Math.sign(gap),
        };
    }
    return null;
  }
  const puddleAt = (x, z, grow = 0) =>
    PUDDLES.find((p) => {
      const dx = x - p.x,
        dz = z - p.z;
      const c = Math.cos(p.turn),
        s = Math.sin(p.turn);
      const u = (dx * c - dz * s) / (p.rx + grow),
        v = (dx * s + dz * c) / (p.rz + grow);
      return u * u + v * v < 1;
    }) ?? null;

  return {
    group,
    blockers,
    trip,
    train,
    panda,
    balloonSpot,
    trainSpot,
    teaSpot,
    house,
    seat,
    cups,
    shoots,
    puddles: PUDDLES,
    pool: { ...POOL_AT, r: POOL.r },
    contains: (x, z) => walkable(x, z),
    heightAt,
    // The camera keeps above the hill, and above the tea house roof.
    cameraFloor(x, z) {
      const roof =
        Math.abs(x - TEA_HOUSE.x) < TEA_HOUSE.halfWidth + 1 &&
        z > TEA_HOUSE.z + TEA_HOUSE.back - 1 &&
        z < TEA_HOUSE.z + TEA_HOUSE.front + 1;
      return roof ? TERRACES[0].height + 4.8 : heightAt(x, z);
    },
    // Roofs the rain does not fall through, as boxes on the ground plan.
    roofs: [
      {
        x0: TEA_HOUSE.x - TEA_HOUSE.halfWidth - 0.7,
        x1: TEA_HOUSE.x + TEA_HOUSE.halfWidth + 0.7,
        z0: TEA_HOUSE.z + TEA_HOUSE.back - 0.7,
        z1: TEA_HOUSE.z + TEA_HOUSE.front + 0.7,
        y: TERRACES[0].height + 2.9,
      },
    ],
    hedgeNear,
    puddleAt,
    nearby(position) {
      if (nearBy(position, balloonSpot, 2.6)) return { kind: "balloon" };
      if (!train.riding && nearBy(position, trainSpot, 2.4))
        return { kind: "train" };
      if (
        position.y > TERRACES[0].height - 0.1 &&
        nearBy(position, teaSpot, 1.9)
      )
        return { kind: "tea" };
      if (puddleAt(position.x, position.z, 0.9) === PUDDLES[0])
        return { kind: "puddle" };
      const hedge = hedgeNear(position);
      if (hedge) return { kind: "pick", hedge };
      return null;
    },
    // Picks the nearest unpicked shoot within reach of a point, if any.
    pickShoot(point, reach = 2.2) {
      let best = -1,
        bestGap = reach;
      shoots.forEach((shoot, i) => {
        if (shoot.picked) return;
        const gap = Math.hypot(shoot.x - point.x, shoot.z - point.z);
        if (gap < bestGap && Math.abs(shoot.y - point.y) < 1.4) {
          best = i;
          bestGap = gap;
        }
      });
      if (best < 0) return null;
      shoots[best].picked = true;
      placeShoot(best);
      shootMesh.instanceMatrix.needsUpdate = true;
      return shoots[best];
    },
    regrow() {
      shoots.forEach((shoot, i) => {
        if (!shoot.picked) return;
        shoot.picked = false;
        placeShoot(i);
      });
      shootMesh.instanceMatrix.needsUpdate = true;
    },
    // How misty it still is, from 1 in the rain to 0 once it clears.
    animate(dt, time, wet = 1) {
      if (envelope) envelope.rotation.z = Math.sin(time * 0.6) * 0.03;
      foams.forEach((foam, i) => {
        const pulse = 1 + Math.sin(time * 6 + i * 1.7) * 0.12;
        foam.scale.set(1.3 * pulse, 0.45 * (2 - pulse), 0.8 * pulse);
      });
      flags.forEach((flag, i) => {
        flag.rotation.x = Math.sin(time * 3 + i * 0.8) * 0.35;
      });
      for (const s of snails) {
        s.angle += (s.speed / s.r) * dt * 6;
        const { x, z } = polar(s.r, s.angle);
        s.snail.position.set(x, s.y, z);
        s.snail.rotation.y =
          s.angle + (s.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      cloudMaterial.opacity = 0.05 + 0.17 * wet;
      for (const c of clouds) {
        c.angle += c.speed * dt;
        const { x, z } = polar(c.r, c.angle);
        c.cloud.position.set(x, c.y + Math.sin(time * 0.3 + c.r) * 0.3, z);
        c.cloud.rotation.y = c.angle;
      }
      panda.animate(dt, time, context.hero.position);
    },
    reset() {
      trip.reset();
      train.reset();
      cups.forEach(({ tea }) => (tea.visible = false));
      this.regrow();
    },
  };
}

// A local point of a group on the ground plan, as world x and z.
function localToWorld(object, x, z) {
  object.updateMatrixWorld(true);
  const point = new THREE.Vector3(x, 0, z).applyMatrix4(object.matrixWorld);
  return { x: point.x, z: point.z };
}
