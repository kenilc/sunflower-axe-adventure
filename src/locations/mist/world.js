import * as THREE from "three";
import { instantiateModel } from "../../assets/models.js";
import { createDioramaBase } from "../../rendering/diorama-base.js";
import { markGlow } from "../../rendering/glow.js";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createTreeVisibility } from "../../rendering/tree-visibility.js";
import { createRandom } from "../../systems/random.js";
import { createBalloonTrip } from "./balloon-trip.js";
import { createWanderers } from "./wanderers.js";

// Mistwood Hollow: a misty forest at dusk on a round board. The balloon lands
// in a meadow to the south; a lantern path winds north through the trees to
// a clearing where five sleepy animal houses sit round a little pond.
// Little mist puffs drift in a glade beside the path. Two trails lead on
// from the clearing: west to a grove of toadstools, and east over a stream
// to a berry patch.
export const MIST_SIZE = 54;
const EDGE = MIST_SIZE - 1.4;
const CLEARING = { x: 0, z: -14, r: 20 };
const FIELD = { x: 0, z: 30, r: 6.5 };
const POND = { x: 0, z: -14, r: 3.4 };
const GROVE = { x: -30, z: -6, r: 7 };
const BERRIES = { x: 31, z: -1, r: 7 };
// The path winds between these depths, from the meadow to the clearing.
const PATH = { from: 4, to: 26, half: 1.5 };
export const pathX = (z) => 3.2 * Math.sin(z * 0.22);
const GLADE = { x: pathX(14) - 5, z: 14, r: 4 };
// The camera looks north, so south of the meadow and of each corner the
// trees give way to low ferns, and the friends stay in sight there.
const LAWNS = [
  { x: 0, z: FIELD.z + 14, r: 12 },
  { x: -30, z: 8, r: 8 },
  { x: 30, z: 14, r: 10 },
  { x: -18, z: 6, r: 5 },
  { x: 20, z: 5, r: 6 },
];
// Narrower trails out to the new corners, as lists of [x, z] bends. The
// west one leaves between the frog house and the log; the east one between
// the owl and the turtle, over the stream's bridge.
const TRAILS = [
  [
    [-12, -3],
    [-18, -2],
    [-24.5, -5],
  ],
  [
    [15.5, -5.5],
    [21, -4],
    [26, -2.5],
  ],
];
const TRAIL_HALF = 1.3;
// A stream running north to south through the eastern trees.
const STREAM = { half: 0.9, from: -47, to: 47 };
export const streamX = (z) => 22 + 1.2 * Math.sin(z * 0.25);
const BRIDGE = { x: streamX(-4), z: -4 };
// The houses in assets/blender/build_mist_houses.py: how far each one's
// door stands in front of its centre, and its head's half-width, both at
// the model's own size. Built small, they stand twice as big in the
// hollow, so the friends fit through the doors and walk inside.
export const HOUSE_SCALE = 2;
const HOUSES = [
  { kind: "frog", angle: -1.6, front: 2.13, width: 2.8 },
  { kind: "cat", angle: -0.55, front: 1.96, width: 2.5 },
  { kind: "rabbit", angle: 0.55, front: 1.87, width: 2.3 },
  { kind: "owl", angle: 1.6, front: 1.75, width: 2.2 },
  // The turtle sits a little closer in, to the southeast, so its shell
  // stays clear of the trees and the path.
  { kind: "turtle", angle: 2.45, front: 2.98, width: 2.75, ring: 14 },
];
const HOUSE_RING = 15;
const LOG = new THREE.Vector3(-5, 0, -8);
// Where each forest animal strolls, as a loop of [x, z] stops: the
// hedgehog round the toadstools, the squirrel among the berry bushes, the
// fox back and forth over the bridge, the fawn from the meadow up the
// lantern path and back, and the duck round the pond, wide of the log.
const fawnPath = [24, 21, 15, 9].map((z) => [pathX(z), z]);
export const WANDER_ROUTES = {
  hedgehog: [
    [-26, -3.5],
    [-30, -2],
    [-33.5, -5],
    [-31, -9.5],
    [-26.5, -8.5],
    [-21, -2.8],
  ],
  squirrel: [
    [29, 1.5],
    [32, 2],
    [33.5, -1],
    [30, -3.8],
    [28, -1.5],
  ],
  fox: [
    [12.5, -8.5],
    [16.5, -5.3],
    [21, -4],
    [25.8, -2.3],
    [21, -4],
    [16.5, -5.3],
  ],
  fawn: [
    [3.5, 32],
    [3.5, 26.5],
    ...fawnPath,
    ...fawnPath.slice(0, -1).reverse(),
  ],
  duck: [0, 0.9, 1.8, 2.7, 3.6, 4.5].map((a) => [
    Math.sin(a) * 7.2,
    -14 + Math.cos(a) * 7.2,
  ]),
};
const PINES = ["#3e6b6e", "#467a74", "#36605f", "#4d7f7c"];
const ROUNDS = ["#4c7a73", "#5a8578", "#456f6d"];

const inCircle = (x, z, c, margin = 0) =>
  Math.hypot(x - c.x, z - c.z) < c.r + margin;
function onPath(x, z, margin = 0) {
  if (z < PATH.from - margin || z > PATH.to + margin) return false;
  return Math.abs(x - pathX(z)) < PATH.half + margin;
}
// How far a point is from a trail's middle line.
function trailGap(x, z, trail) {
  let gap = Infinity;
  for (let i = 1; i < trail.length; i++) {
    const [ax, az] = trail[i - 1],
      [bx, bz] = trail[i];
    const dx = bx - ax,
      dz = bz - az;
    const t = THREE.MathUtils.clamp(
      ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz),
      0,
      1,
    );
    gap = Math.min(gap, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return gap;
}
const onTrail = (x, z, margin = 0) =>
  TRAILS.some((trail) => trailGap(x, z, trail) < TRAIL_HALF + margin);
export function walkable(x, z, margin = 0) {
  if (Math.hypot(x, z) > EDGE) return false;
  return (
    [CLEARING, FIELD, GLADE, GROVE, BERRIES].some((c) =>
      inCircle(x, z, c, margin),
    ) ||
    onPath(x, z, margin) ||
    onTrail(x, z, margin)
  );
}
// How far a tree stands from anywhere the friends can walk.
function clearance(x, z) {
  let gap = Infinity;
  for (const c of [CLEARING, FIELD, GLADE, GROVE, BERRIES])
    gap = Math.min(gap, Math.hypot(x - c.x, z - c.z) - c.r);
  for (let t = PATH.from; t <= PATH.to; t += 0.5)
    gap = Math.min(gap, Math.hypot(x - pathX(t), z - t) - PATH.half);
  for (const trail of TRAILS)
    gap = Math.min(gap, trailGap(x, z, trail) - TRAIL_HALF);
  return gap;
}

export function createMistWorld(context) {
  const group = new THREE.Group();
  group.name = "mistwood-hollow";
  context.scene.add(group);
  const helpers = createMeshFactory(group);
  const { mesh, box, cyl, ball } = helpers;
  const rand = createRandom(3109);
  const blockers = [];
  // Tall things a photo should not be taken through: toadstool caps and
  // the trees by the paths, as circles on the ground.
  const occluders = [];
  const visibility = createTreeVisibility();
  const glowing = (color, intensity = 1.4) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.6,
    });
  const paper = glowing("#ffd99a");

  createDioramaBase({
    parent: group,
    mesh,
    size: MIST_SIZE,
    top: -0.03,
    grass: "#4f6a62",
    soil: "#3b2f2c",
    stone: "#6e7a78",
    rock: "#4a4f58",
    seed: 3109,
  });
  // Softer moss where the friends walk: the meadow, the glade, the clearing
  // and the two corners.
  for (const [c, color] of [
    [CLEARING, "#5d7d6e"],
    [FIELD, "#62806c"],
    [GLADE, "#5a7a6c"],
    [GROVE, "#5f7a72"],
    [BERRIES, "#5f806c"],
  ]) {
    const moss = cyl(c.r, c.r, 0.04, color, c.x, -0.005, c.z, group, 32);
    moss.castShadow = false;
  }

  // A pale stone path winding north between the trees.
  for (let z = PATH.to + 1; z > PATH.from - 1.2; z -= 0.95) {
    const slope = 3.2 * 0.22 * Math.cos(z * 0.22);
    const stone = box(2.5, 0.05, 0.9, "#a5a3b6", pathX(z), 0.03, z);
    stone.rotation.y = Math.atan(slope);
    stone.castShadow = false;
  }

  // Paper lanterns on crooked posts, every few steps along the path.
  const lanterns = [];
  function lantern(x, z, side, parent = group) {
    const post = new THREE.Group();
    post.position.set(x, 0, z);
    parent.add(post);
    cyl(0.07, 0.09, 3.2, "#5a4338", 0, 1.6, 0, post, 6);
    box(0.55, 0.08, 0.08, "#5a4338", -side * 0.24, 3.16, 0, post);
    const light = mesh(
      new THREE.IcosahedronGeometry(0.2, 2),
      paper,
      -side * 0.46,
      2.86,
      0,
      post,
    );
    light.scale.y = 1.2;
    light.castShadow = false;
    lanterns.push(light);
    blockers.push({ x, z, r: 0.25 });
    return post;
  }
  for (let z = PATH.to - 0.5, i = 0; z > PATH.from; z -= 2.6, i++) {
    const side = i % 2 ? 1 : -1;
    lantern(pathX(z) + side * 1.75, z, side);
  }

  // The trails out to the corners: smaller stones, a lantern at each bend.
  const corners = createRandom(4217);
  for (const trail of TRAILS)
    for (let i = 1; i < trail.length; i++) {
      const [ax, az] = trail[i - 1],
        [bx, bz] = trail[i];
      const length = Math.hypot(bx - ax, bz - az);
      for (let d = 0.4; d < length; d += 0.85) {
        const t = d / length;
        const stone = box(
          1.9,
          0.05,
          0.7,
          "#a5a3b6",
          ax + (bx - ax) * t,
          0.03,
          az + (bz - az) * t,
        );
        stone.rotation.y = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
        stone.castShadow = false;
      }
    }
  for (const [x, z, side] of [
    [-18, -0.4, 1],
    [15.6, -3.9, -1],
    [25.4, -0.9, -1],
  ])
    lantern(x, z, side);

  // The stream: still dark water between mossy stones, with a little
  // humped bridge where the east trail crosses.
  const streamWater = new THREE.MeshStandardMaterial({
    color: "#5d78a3",
    roughness: 0.5,
  });
  for (let z = STREAM.from; z < STREAM.to; z += 0.8) {
    const slope = 1.2 * 0.25 * Math.cos(z * 0.25);
    const strip = box(
      STREAM.half * 2,
      0.04,
      0.95,
      streamWater,
      streamX(z),
      0.02,
      z,
    );
    strip.rotation.y = Math.atan(slope);
    strip.castShadow = false;
    if (Math.abs(z - BRIDGE.z) < 2) continue;
    for (const side of [-1, 1]) {
      if (corners() < 0.45) continue;
      const pebble = ball(
        0.18 + corners() * 0.14,
        corners() < 0.5 ? "#7d8582" : "#6d7a6c",
        streamX(z) + side * (STREAM.half + 0.1),
        0.04,
        z + corners() * 0.6,
      );
      pebble.scale.y = 0.5;
    }
  }
  const bridge = new THREE.Group();
  bridge.position.set(BRIDGE.x, 0, BRIDGE.z);
  bridge.rotation.y = Math.atan2(26 - 15.5, -2.5 + 5.5);
  group.add(bridge);
  for (let k = -4; k <= 4; k++) {
    const plank = box(2.3, 0.1, 0.34, "#9a7558", 0, 0.1, k * 0.38, bridge);
    plank.position.y = 0.06 + 0.12 * Math.cos((k / 4) * (Math.PI / 2));
  }
  for (const side of [-1, 1]) {
    for (const k of [-1, 0, 1])
      cyl(0.06, 0.07, 0.8, "#6b5244", side * 1.2, 0.45, k * 1.45, bridge, 6);
    box(0.08, 0.08, 3, "#7a5c4a", side * 1.2, 0.82, 0, bridge);
  }

  // The toadstool grove: tall soft-capped toadstools round its edge, and a
  // fairy ring of little glowing mushrooms in the middle.
  for (const [angle, tall, cap, color] of [
    [0.3, 2.2, 1.2, "#e98a8a"],
    [5.5, 1.6, 0.9, "#b9a6dc"],
    [2.5, 2.5, 1.35, "#e98a8a"],
    [3.6, 1.8, 1, "#f2b6b8"],
    [4.6, 2.3, 1.25, "#b9a6dc"],
  ]) {
    const x = GROVE.x + Math.sin(angle) * (GROVE.r - 1.2),
      z = GROVE.z + Math.cos(angle) * (GROVE.r - 1.2);
    const toadstool = new THREE.Group();
    toadstool.position.set(x, 0, z);
    toadstool.rotation.z = (corners() - 0.5) * 0.12;
    group.add(toadstool);
    cyl(cap * 0.22, cap * 0.3, tall, "#f4ead6", 0, tall / 2, 0, toadstool, 10);
    const top = mesh(
      new THREE.SphereGeometry(cap, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      color,
      0,
      tall - 0.1,
      0,
      toadstool,
    );
    top.scale.y = 0.62;
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + corners() * 0.4,
        lift = 0.45 + (k % 2) * 0.35;
      const spot = ball(
        cap * 0.13,
        "#fff6ea",
        Math.sin(a) * Math.cos(lift) * cap,
        tall - 0.1 + Math.sin(lift) * cap * 0.62,
        Math.cos(a) * Math.cos(lift) * cap,
        toadstool,
      );
      spot.scale.y = 0.45;
      spot.castShadow = false;
    }
    blockers.push({ x, z, r: cap * 0.35 + 0.15 });
    occluders.push({ x, z, r: cap });
    visibility.add(toadstool);
  }
  const fairyGlow = glowing("#e6d6ff", 0.9);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const x = GROVE.x + Math.sin(a) * 2.4,
      z = GROVE.z + Math.cos(a) * 2.4;
    cyl(0.05, 0.06, 0.2, "#f4ead6", x, 0.1, z, group, 6).castShadow = false;
    const cap = mesh(
      new THREE.SphereGeometry(0.14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      fairyGlow,
      x,
      0.18,
      z,
    );
    cap.scale.y = 0.7;
    cap.castShadow = false;
    markGlow(cap);
  }

  // The berry patch: round bushes heavy with berries, and a basket left
  // on a stump.
  const berryColors = ["#d9506a", "#7d6fc4", "#e57a8c"];
  for (const [angle, size] of [
    [0.4, 1],
    [1.3, 0.85],
    [2.3, 1.1],
    [3.3, 0.9],
    [5.4, 1],
  ]) {
    const x = BERRIES.x + Math.sin(angle) * (BERRIES.r - 1.1),
      z = BERRIES.z + Math.cos(angle) * (BERRIES.r - 1.1);
    const bush = new THREE.Group();
    bush.position.set(x, 0, z);
    group.add(bush);
    for (let k = 0; k < 3; k++)
      ball(
        size * (0.7 - k * 0.1),
        k ? "#4f7a5e" : "#557f63",
        Math.sin(k * 2.2) * size * 0.45,
        size * 0.55,
        Math.cos(k * 2.2) * size * 0.45,
        bush,
      ).scale.y = 0.85;
    for (let k = 0; k < 12; k++) {
      const a = corners() * Math.PI * 2,
        lift = corners() * 1.1;
      ball(
        0.08,
        berryColors[k % 3],
        Math.sin(a) * Math.cos(lift) * size * 0.8,
        size * 0.5 + Math.sin(lift) * size * 0.6,
        Math.cos(a) * Math.cos(lift) * size * 0.8,
        bush,
      ).castShadow = false;
    }
    blockers.push({ x, z, r: size * 0.85 });
    visibility.add(bush);
  }
  const stump = new THREE.Vector3(BERRIES.x + 1.6, 0, BERRIES.z - 2.2);
  cyl(0.5, 0.58, 0.5, "#7a5c4a", stump.x, 0.25, stump.z, group, 12);
  cyl(0.46, 0.46, 0.02, "#c8a27a", stump.x, 0.51, stump.z, group, 12);
  cyl(0.28, 0.22, 0.26, "#c8955a", stump.x, 0.65, stump.z, group, 12);
  for (let k = 0; k < 7; k++)
    ball(
      0.07,
      berryColors[k % 3],
      stump.x + Math.sin(k * 0.9) * 0.16,
      0.8,
      stump.z + Math.cos(k * 0.9) * 0.16,
    ).castShadow = false;
  blockers.push({ x: stump.x, z: stump.z, r: 0.65 });

  // The fern lawns, with clumps of pale flowers, where the forest stops.
  const fern = new THREE.ConeGeometry(0.16, 1, 5);
  for (let i = 0; i < 150; i++) {
    const lawn = LAWNS[i % 2 ? 0 : 1 + ((i / 2) % (LAWNS.length - 1))];
    const a = corners() * Math.PI * 2,
      d = Math.sqrt(corners()) * lawn.r;
    const x = lawn.x + Math.sin(a) * d,
      z = lawn.z + Math.cos(a) * d;
    if (
      Math.hypot(x, z) > EDGE - 0.6 ||
      walkable(x, z, 0.5) ||
      Math.abs(x - streamX(z)) < STREAM.half + 0.4
    )
      continue;
    const clump = new THREE.Group();
    clump.position.set(x, 0, z);
    clump.rotation.y = corners() * Math.PI;
    group.add(clump);
    if (i % 3) {
      const size = 0.6 + corners() * 0.6;
      for (let k = 0; k < 5; k++) {
        const frond = mesh(fern, k % 2 ? "#5f8a6e" : "#6b9476", 0, 0, 0, clump);
        frond.rotation.set(0.75, (k / 5) * Math.PI * 2, 0, "YXZ");
        frond.scale.set(1, size, 0.35);
        frond.position.set(
          Math.sin((k / 5) * Math.PI * 2) * 0.25 * size,
          0.3 * size,
          Math.cos((k / 5) * Math.PI * 2) * 0.25 * size,
        );
        frond.castShadow = false;
      }
    } else
      for (let k = 0; k < 4; k++) {
        const x2 = Math.sin(k * 1.6) * 0.25,
          z2 = Math.cos(k * 1.6) * 0.25;
        cyl(0.015, 0.015, 0.4, "#6aa84f", x2, 0.2, z2, clump, 4).castShadow =
          false;
        ball(
          0.08,
          ["#e6d6ff", "#fff6ea", "#f2b6c8"][(i + k) % 3],
          x2,
          0.42,
          z2,
          clump,
        ).castShadow = false;
      }
  }

  // The meadow where the balloon comes down.
  const balloon = instantiateModel(context.models.balloon);
  balloon.position.set(-2.6, 0, FIELD.z + 1.6);
  group.add(balloon);
  const envelope = balloon.getObjectByName("envelope");
  for (const dx of [-2.3, 2.3])
    cyl(0.1, 0.12, 0.4, "#5a4338", -2.6 + dx, 0.2, FIELD.z + 1.6, group, 6);
  blockers.push({ x: -2.6, z: FIELD.z + 1.6, r: 1.3 });
  visibility.add(balloon, {
    meshes: (() => {
      const list = [];
      balloon.traverse((node) => node.isMesh && list.push(node));
      return list;
    })(),
    dynamic: true,
  });
  const trip = createBalloonTrip(context, { balloon, destination: "polder" });
  const balloonSpot = new THREE.Vector3(0, 0, FIELD.z + 0.6);

  // The forest: pines and round trees in misty teal, thick right up to the
  // paths. Trees near a path, or a little way south of one where the camera
  // looks across them, fade when they hide her; those deeper in, which
  // never come between her and the camera, share instanced meshes.
  const cones = [],
    trunks = [],
    crowns = [];
  function tree(x, z) {
    const tall = 4.5 + rand() * 4;
    const pine = rand() < 0.62;
    const near =
      clearance(x, z) < 7 ||
      clearance(x, z - 8) < 6 ||
      clearance(x, z - 15) < 4;
    if (!near) {
      trunks.push({ x, z, tall });
      if (pine)
        for (let k = 0; k < 3; k++)
          cones.push({
            x,
            z,
            y: tall * (0.38 + k * 0.2),
            r: tall * (0.3 - k * 0.07),
            h: tall * 0.4,
            color: PINES[Math.floor(rand() * PINES.length)],
          });
      else {
        const color = ROUNDS[Math.floor(rand() * ROUNDS.length)];
        for (let k = 0; k < 3; k++)
          crowns.push({
            x: x + Math.cos(k * 2.1) * tall * 0.12,
            z: z + Math.sin(k * 2.1) * tall * 0.12,
            y: tall * (0.58 + (k % 2) * 0.1),
            r: tall * 0.24,
            color,
          });
      }
      return;
    }
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);
    plant.rotation.y = rand() * Math.PI;
    group.add(plant);
    cyl(0.18, 0.26, tall * 0.5, "#4a3a3a", 0, tall * 0.25, 0, plant, 6);
    if (pine) {
      const color = PINES[Math.floor(rand() * PINES.length)];
      for (let k = 0; k < 3; k++)
        mesh(
          new THREE.ConeGeometry(tall * (0.3 - k * 0.07), tall * 0.4, 7),
          color,
          0,
          tall * (0.38 + k * 0.2),
          0,
          plant,
        );
    } else {
      const color = ROUNDS[Math.floor(rand() * ROUNDS.length)];
      for (let k = 0; k < 3; k++) {
        const crown = ball(
          tall * 0.24,
          color,
          Math.cos(k * 2.1) * tall * 0.12,
          tall * (0.58 + (k % 2) * 0.1),
          Math.sin(k * 2.1) * tall * 0.12,
          plant,
        );
        crown.scale.y = 0.8;
      }
    }
    visibility.add(plant);
    occluders.push({ x, z, r: tall * 0.3 });
  }
  for (let x = -MIST_SIZE; x <= MIST_SIZE; x += 2.9)
    for (let z = -MIST_SIZE; z <= MIST_SIZE; z += 2.9) {
      const px = x + (rand() - 0.5) * 2.2,
        pz = z + (rand() - 0.5) * 2.2;
      if (
        Math.hypot(px, pz) > EDGE - 0.8 ||
        clearance(px, pz) < 1.1 ||
        LAWNS.some((lawn) => inCircle(px, pz, lawn)) ||
        Math.abs(px - streamX(pz)) < STREAM.half + 0.9
      )
        continue;
      tree(px, pz);
    }
  const placed = new THREE.Object3D();
  const coneMesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 7),
    new THREE.MeshStandardMaterial({ roughness: 0.88, flatShading: true }),
    cones.length,
  );
  cones.forEach(({ x, z, y, r, h, color }, i) => {
    placed.position.set(x, y, z);
    placed.scale.set(r, h, r);
    placed.updateMatrix();
    coneMesh.setMatrixAt(i, placed.matrix);
    coneMesh.setColorAt(i, new THREE.Color(color));
  });
  const crownMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshStandardMaterial({ roughness: 0.88, flatShading: true }),
    crowns.length,
  );
  crowns.forEach(({ x, z, y, r, color }, i) => {
    placed.position.set(x, y, z);
    placed.scale.set(r, r * 0.8, r);
    placed.updateMatrix();
    crownMesh.setMatrixAt(i, placed.matrix);
    crownMesh.setColorAt(i, new THREE.Color(color));
  });
  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.18, 0.26, 1, 6),
    helpers.mat("#4a3a3a"),
    trunks.length,
  );
  trunks.forEach(({ x, z, tall }, i) => {
    placed.position.set(x, tall * 0.25, z);
    placed.scale.set(1, tall * 0.5, 1);
    placed.updateMatrix();
    trunkMesh.setMatrixAt(i, placed.matrix);
  });
  for (const forest of [coneMesh, crownMesh, trunkMesh]) {
    forest.name = "mist-forest";
    forest.castShadow = true;
    forest.receiveShadow = true;
    group.add(forest);
  }

  // The pond in the middle of the clearing, ringed with stones and lily pads.
  const water = cyl(
    POND.r,
    POND.r,
    0.04,
    new THREE.MeshStandardMaterial({
      color: "#5d78a3",
      roughness: 0.55,
    }),
    POND.x,
    0.03,
    POND.z,
    group,
    28,
  );
  water.castShadow = false;
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const rock = ball(
      0.32 + rand() * 0.16,
      i % 3 ? "#7d8582" : "#6d7a6c",
      POND.x + Math.cos(a) * (POND.r + 0.15),
      0.05,
      POND.z + Math.sin(a) * (POND.r + 0.15),
    );
    rock.scale.y = 0.5;
  }
  for (const [x, z] of [
    [-1.4, 0.8],
    [1.6, -1.1],
    [0.4, 1.8],
    [-0.8, -1.8],
  ].map(([dx, dz]) => [POND.x + dx, POND.z + dz])) {
    const pad = cyl(0.42, 0.42, 0.03, "#6f9a6a", x, 0.07, z, group, 10);
    pad.castShadow = false;
  }
  blockers.push({ x: POND.x, z: POND.z, r: POND.r + 0.35 });

  // Paper lanterns that float on the pond, one for each time they set one
  // down. They drift slowly round.
  const floating = Array.from({ length: 6 }, () => {
    const boat = new THREE.Group();
    boat.visible = false;
    group.add(boat);
    cyl(0.26, 0.2, 0.08, "#f2b6b8", 0, 0.06, 0, boat, 8);
    const light = mesh(
      new THREE.IcosahedronGeometry(0.16, 2),
      paper,
      0,
      0.24,
      0,
      boat,
    );
    light.castShadow = false;
    markGlow(light);
    return { boat, angle: 0, radius: 0, speed: 0 };
  });
  let afloat = 0;

  // The sleepy animal houses round the pond, facing it. Each door leads
  // inside. The head blocks the way except at its door: a circle set back
  // so its front stops just short of the doorway.
  const houses = HOUSES.map(
    ({ kind, angle, front, width, ring = HOUSE_RING }) => {
      const out = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle));
      const facing = out.clone().negate();
      const home = instantiateModel(
        context.models.mist_houses.getObjectByName(`${kind}-house`),
      );
      home.position.set(POND.x + out.x * ring, 0, POND.z + out.z * ring);
      home.rotation.y = Math.atan2(-out.x, -out.z);
      home.scale.setScalar(HOUSE_SCALE);
      group.add(home);
      markGlow(home.getObjectByName(`${kind}-house-glow`));
      const meshes = [];
      home.traverse((node) => node.isMesh && meshes.push(node));
      visibility.add(home, { meshes });
      const doorway = front * HOUSE_SCALE;
      const reach = width * HOUSE_SCALE * 0.9;
      const head = home.position
        .clone()
        .addScaledVector(facing, doorway - 0.3 - reach);
      blockers.push({ x: head.x, z: head.z, r: reach });
      // And a second circle for the back of the head (or the shell).
      const back = home.position
        .clone()
        .addScaledVector(facing, -width * HOUSE_SCALE * 0.5);
      blockers.push({ x: back.x, z: back.z, r: width * HOUSE_SCALE * 0.6 });
      const post = new THREE.Vector3(
        ...(kind === "turtle"
          ? [2.8, 0, 2.6]
          : [kind === "rabbit" || kind === "owl" ? -2.1 : 2.1, 0, 2]),
      )
        .multiplyScalar(HOUSE_SCALE)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), home.rotation.y);
      blockers.push({
        x: home.position.x + post.x,
        z: home.position.z + post.z,
        r: 0.35,
      });
      return {
        kind,
        home,
        facing,
        // Step onto this spot, at the door, to walk in.
        door: home.position.clone().addScaledVector(facing, doorway + 0.4),
        // Where they come back out, on the stepping stones.
        outside: home.position.clone().addScaledVector(facing, doorway + 2.6),
        visited: false,
        wiggle: 0,
      };
    },
  );

  // A mossy log by the pond, for sitting and watching the lanterns float.
  const log = new THREE.Group();
  log.position.copy(LOG);
  log.rotation.y = Math.atan2(POND.x - LOG.x, POND.z - LOG.z);
  group.add(log);
  const trunk = cyl(0.34, 0.36, 2.4, "#6b5244", 0, 0.34, -0.15, log, 10);
  trunk.rotation.z = Math.PI / 2;
  const moss = ball(0.36, "#7f9f72", 0.5, 0.62, -0.15, log);
  moss.scale.set(1.6, 0.4, 0.9);
  blockers.push({ x: LOG.x, z: LOG.z, r: 0.6 });
  const restSpot = LOG.clone().add(
    new THREE.Vector3(0, 0, 1.2).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      log.rotation.y,
    ),
  );

  // Mist puffs: soft round wisps with tiny faces. Most bob about the glade;
  // a few hover by the path and the clearing.
  const wispMaterial = new THREE.MeshStandardMaterial({
    color: "#f4f2ff",
    emissive: "#d9dcff",
    emissiveIntensity: 0.55,
    roughness: 0.9,
  });
  function wisp(x, y, z) {
    const puff = new THREE.Group();
    puff.position.set(x, y, z);
    group.add(puff);
    const body = mesh(
      new THREE.IcosahedronGeometry(0.3, 2),
      wispMaterial,
      0,
      0,
      0,
      puff,
    );
    body.castShadow = false;
    for (const side of [-1, 1]) {
      const eye = ball(0.055, "#3a2f36", side * 0.1, 0.04, 0.26, puff);
      eye.castShadow = false;
      const blush = ball(0.05, "#f5a6a8", side * 0.19, -0.05, 0.23, puff);
      blush.scale.set(1, 0.6, 0.4);
      blush.castShadow = false;
    }
    markGlow(body);
    return {
      puff,
      home: puff.position.clone(),
      phase: rand() * Math.PI * 2,
    };
  }
  const wisps = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    wisps.push(
      wisp(
        GLADE.x + Math.cos(a) * 2.2,
        1.2 + rand() * 0.8,
        GLADE.z + Math.sin(a) * 2.2,
      ),
    );
  }
  const strays = [
    [pathX(20) - 2.8, 1.6, 20],
    [pathX(8) + 2.6, 1.9, 8],
    [-11, 2.4, -4],
    [15, 2.4, 1],
    [5, 2.6, 27],
    [GROVE.x + 1, 2.2, GROVE.z - 3],
    [BERRIES.x + 3, 2.6, BERRIES.z - 4.5],
    [streamX(14) - 2, 1.8, 14],
  ].map(([x, y, z]) => wisp(x, y, z));

  // Low mist lying over the ground, drifting slowly.
  const mistMaterial = new THREE.MeshBasicMaterial({
    color: "#e4e2f6",
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  });
  const banks = [];
  for (let i = 0; i < 24; i++) {
    const a = rand() * Math.PI * 2,
      r = 4 + rand() * 42;
    const bank = mesh(
      new THREE.CircleGeometry(4 + rand() * 3, 16),
      mistMaterial,
      Math.cos(a) * r,
      0.5 + rand() * 1.4,
      Math.sin(a) * r,
    );
    bank.rotation.x = -Math.PI / 2;
    bank.castShadow = false;
    bank.receiveShadow = false;
    bank.renderOrder = 2;
    banks.push({ bank, home: bank.position.clone(), phase: rand() * 6 });
  }

  // Warm light pooling round the lanterns and the house doors.
  for (const [x, y, z, power, color = "#ffcf8a"] of [
    [0, 4, -10, 45],
    [pathX(15), 2.5, 15, 30],
    [0, 3, FIELD.z - 1, 26],
    [GROVE.x, 3, GROVE.z, 22, "#d9c6ff"],
    [BERRIES.x, 3, BERRIES.z, 22],
  ]) {
    const light = new THREE.PointLight(color, power, 16, 1.6);
    light.position.set(x, y, z);
    group.add(light);
  }
  for (const light of lanterns) markGlow(light);

  // The forest animals out for a stroll, added last so they walk round
  // everything above.
  const wanderers = createWanderers({
    parent: group,
    routes: WANDER_ROUTES,
    blockers,
    contains: (x, z) => walkable(x, z),
  });
  const animals = wanderers.animals;
  const clearSpot = (spot, self) =>
    walkable(spot.x, spot.z, -0.5) &&
    blockers.every(
      (b) =>
        b === self.obstacle ||
        Math.hypot(spot.x - b.x, spot.z - b.z) > b.r + 0.6,
    );

  let gathering = 0,
    elapsed = 0;
  return {
    group,
    blockers,
    visibility,
    trip,
    balloon,
    balloonSpot,
    houses,
    wisps,
    floating,
    log,
    restSpot,
    pond: POND,
    glade: GLADE,
    grove: GROVE,
    berries: BERRIES,
    bridge: BRIDGE,
    clearing: CLEARING,
    contains: (x, z) => walkable(x, z),
    heightAt: () => 0,
    nearby(position) {
      const near = (spot, reach) =>
        Math.hypot(position.x - spot.x, position.z - spot.z) < reach;
      if (near(balloonSpot, 2.6)) return { kind: "balloon" };
      if (near(restSpot, 1.6)) return { kind: "rest" };
      if (near(POND, POND.r + 1.8)) return { kind: "pond" };
      const animal = animals.find(
        (a) => !a.posing && near(a.group.position, 2.6),
      );
      if (animal) return { kind: "animal", animal };
      if (near(GLADE, GLADE.r)) return { kind: "wisps" };
      return null;
    },
    animals,
    // The animal standing for a photo with the friends, if any.
    get posing() {
      return animals.find((animal) => animal.posing) ?? null;
    },
    // The animal comes to stand beside her, on whichever side it reaches
    // first, he steps round to her other side, and all three face the
    // camera.
    pose(animal) {
      for (const other of animals) other.posing = null;
      const hero = context.hero.position,
        friend = context.companion.character;
      const front = context.camera.position.clone().sub(hero).setY(0);
      if (front.lengthSq() < 1e-4) front.set(0, 0, 1);
      front.normalize();
      const facing = Math.atan2(front.x, front.z);
      const right = new THREE.Vector3(front.z, 0, -front.x);
      const beside = (side, lean, gap = 1.9) =>
        hero
          .clone()
          .addScaledVector(right, side * gap * Math.cos(lean))
          .addScaledVector(front, gap * Math.sin(lean));
      const [spot] = [1, -1]
        .flatMap((side) =>
          [0, 0.4, 0.8].map((lean) => ({ side, at: beside(side, lean) })),
        )
        .filter(({ at }) => clearSpot(at, animal))
        .sort(
          (a, b) =>
            a.at.distanceTo(animal.group.position) -
            b.at.distanceTo(animal.group.position),
        );
      if (spot) {
        const his = beside(-spot.side, 0.2, 1.6);
        if (clearSpot(his, animal)) friend.position.copy(his);
      }
      animal.posing = {
        spot: spot?.at ?? animal.group.position.clone(),
        facing,
        anchor: hero.clone(),
        time: 0,
      };
      context.hero.rotation.y = facing;
      friend.rotation.y = facing;
      return animal;
    },
    // Which way, and how far back, to stand for a photo of `target` from
    // about `facing`, round any toadstool, tree or house in the way.
    photoView(target, facing, distance) {
      const solid = [
        ...occluders,
        ...blockers.filter((b) => !animals.some((a) => a.obstacle === b)),
      ];
      const reach = (yaw) => {
        for (let d = 1.5; d < distance; d += 0.5) {
          const x = target.x + Math.sin(yaw) * d,
            z = target.z + Math.cos(yaw) * d;
          if (solid.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 0.3))
            return d - 0.5;
        }
        return distance;
      };
      let best = { yaw: facing, distance: 0 };
      for (const turn of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
        const yaw = facing + turn,
          clear = reach(yaw);
        if (clear >= distance) return { yaw, distance };
        if (clear > best.distance) best = { yaw, distance: clear };
      }
      return { yaw: best.yaw, distance: Math.max(4, best.distance) };
    },
    get gathering() {
      return gathering > 0;
    },
    // The glade's wisps gather and circle round the friends for a while.
    gather(seconds = 5) {
      gathering = seconds;
    },
    // A happy wiggle as the friends come back out of a house.
    wave(house) {
      house.wiggle = 1.4;
    },
    // A lantern set down at the pond's edge nearest them drifts away.
    floatLantern(from) {
      const slot = floating[afloat % floating.length];
      afloat++;
      slot.angle = Math.atan2(from.z - POND.z, from.x - POND.x);
      slot.radius = POND.r - 0.5 - ((afloat - 1) % 3) * 0.7;
      slot.speed = 0.12 + rand() * 0.08;
      slot.boat.visible = true;
      return afloat;
    },
    reset() {
      gathering = 0;
      afloat = 0;
      for (const house of houses) {
        house.visited = false;
        house.wiggle = 0;
        house.home.scale.setScalar(HOUSE_SCALE);
      }
      for (const slot of floating) slot.boat.visible = false;
      for (const { puff, home } of wisps) puff.position.copy(home);
      trip.reset();
      wanderers.reset();
    },
    animate(dt) {
      elapsed += dt;
      // A pose lasts until she walks off, or a good while passes.
      for (const animal of animals) {
        if (!animal.posing) continue;
        animal.posing.time += dt;
        if (
          animal.posing.time > 40 ||
          context.hero.position.distanceTo(animal.posing.anchor) > 3
        )
          animal.posing = null;
      }
      wanderers.update(dt, elapsed, [
        context.hero.position,
        context.companion.character.position,
      ]);
      gathering = Math.max(0, gathering - dt);
      envelope.rotation.z = Math.sin(elapsed * 0.5) * 0.03;
      envelope.position.y = Math.sin(elapsed * 0.7) * 0.08;
      const hero = context.hero.position;
      wisps.forEach(({ puff, home, phase }, i) => {
        const target = home.clone();
        if (gathering > 0) {
          const a = elapsed * 0.9 + (i / wisps.length) * Math.PI * 2;
          target.set(
            hero.x + Math.cos(a) * 1.8,
            1.6 + Math.sin(elapsed * 2 + i) * 0.3,
            hero.z + Math.sin(a) * 1.8,
          );
        }
        target.y += Math.sin(elapsed * 1.4 + phase) * 0.18;
        puff.position.lerp(target, 1 - Math.exp(-dt * 2.4));
        puff.rotation.y = Math.atan2(
          hero.x - puff.position.x,
          hero.z - puff.position.z,
        );
      });
      for (const { puff, home, phase } of strays) {
        puff.position.y = home.y + Math.sin(elapsed * 1.2 + phase) * 0.22;
        puff.rotation.y = Math.atan2(
          hero.x - puff.position.x,
          hero.z - puff.position.z,
        );
      }
      for (const house of houses) {
        house.wiggle = Math.max(0, house.wiggle - dt);
        const s = Math.sin(house.wiggle * 9) * house.wiggle * 0.05;
        house.home.scale.set(1 + s, 1 - s, 1 + s).multiplyScalar(HOUSE_SCALE);
      }
      for (const slot of floating) {
        if (!slot.boat.visible) continue;
        slot.angle += slot.speed * dt;
        slot.boat.position.set(
          POND.x + Math.cos(slot.angle) * slot.radius,
          Math.sin(elapsed * 1.5 + slot.angle) * 0.02,
          POND.z + Math.sin(slot.angle) * slot.radius,
        );
      }
      for (const { bank, home, phase } of banks)
        bank.position.set(
          home.x + Math.sin(elapsed * 0.08 + phase) * 2,
          home.y,
          home.z + Math.cos(elapsed * 0.06 + phase) * 1.5,
        );
    },
  };
}
