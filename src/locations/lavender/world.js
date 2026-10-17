import * as THREE from "three";
import { instantiateModel } from "../../assets/models.js";
import { createDioramaBase } from "../../rendering/diorama-base.js";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createTreeVisibility } from "../../rendering/tree-visibility.js";
import { createRandom } from "../../systems/random.js";
import { createBalloonTrip } from "../mist/balloon-trip.js";
import { createBargeTrip } from "./barge.js";

// Lavender Hills: a Provence hillside on a round board. Lavender rows climb
// from a river quay in the south to a hilltop village of ochre houses, a
// fountain square under plane trees, market stalls and a bell tower.
export const LAVENDER_SIZE = 34;
const EDGE = LAVENDER_SIZE - 1.4;
// The hill rises between these depths to the village plateau.
const HILL = { foot: 8, top: -14, height: 4 };
// The river runs along the south edge, beyond the quay wall.
const QUAY = 25.4;
// Lavender rows run up the slope either side of the central path.
const ROWS = { first: 3, pitch: 2.4, width: 1.3, count: 10, from: -8, to: 21 };
const TREE = new THREE.Vector3(15, 0, 3);
const PURPLES = ["#8e6bbf", "#9b77c9", "#7f5fb0", "#a585d1"];

export function hillHeight(x, z) {
  const t = THREE.MathUtils.clamp(
    (HILL.foot - z) / (HILL.foot - HILL.top),
    0,
    1,
  );
  return HILL.height * t * t * (3 - 2 * t);
}
function rowAt(x, z, margin = 0) {
  if (z < ROWS.from - margin || z > ROWS.to + margin) return -1;
  if (Math.hypot(x - TREE.x, z - TREE.z) < 4.2) return -1;
  const offset = Math.abs(x) - ROWS.first + margin;
  if (offset < 0) return -1;
  const index = Math.floor(offset / ROWS.pitch);
  if (index >= ROWS.count) return -1;
  return offset - index * ROWS.pitch < ROWS.width + margin * 2 ? index : -1;
}

export function createLavenderWorld(context) {
  const group = new THREE.Group();
  group.name = "lavender-hills";
  context.scene.add(group);
  const helpers = createMeshFactory(group);
  const { mesh, box, cyl, ball } = helpers;
  const rand = createRandom(2207);
  const blockers = [];
  const visibility = createTreeVisibility();
  const stone = "#e2d4b6",
    ochre = "#e3b77a",
    terracotta = "#c4673f",
    shutter = "#5b8fc7",
    gravel = "#dcc9a3";
  const at = (x, z, lift = 0) =>
    new THREE.Vector3(x, hillHeight(x, z) + lift, z);

  // The board, with the hill as its top: a grid lifted to the hill's height
  // and a soil skirt round the rim where the hill stands above the board.
  createDioramaBase({
    parent: group,
    mesh,
    size: LAVENDER_SIZE,
    top: 0,
    grass: null,
    soil: "#c28a55",
    stone: "#e2d4b6",
    rock: "#b5683f",
    seed: 2207,
  });
  const ground = new THREE.PlaneGeometry(
    LAVENDER_SIZE * 2,
    LAVENDER_SIZE * 2,
    68,
    68,
  );
  ground.rotateX(-Math.PI / 2);
  const points = ground.attributes.position;
  for (let i = 0; i < points.count; i++) {
    let x = points.getX(i),
      z = points.getZ(i);
    const r = Math.hypot(x, z);
    if (r > LAVENDER_SIZE) {
      x *= LAVENDER_SIZE / r;
      z *= LAVENDER_SIZE / r;
    }
    points.setXYZ(i, x, hillHeight(x, z), z);
  }
  ground.computeVertexNormals();
  const land = mesh(ground, "#a7ad5c", 0, 0.01, 0);
  land.castShadow = false;
  const skirt = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const x = Math.cos(a) * LAVENDER_SIZE,
      z = Math.sin(a) * LAVENDER_SIZE;
    skirt.push(x, 0, z, x, hillHeight(x, z) + 0.01, z);
  }
  const skirtGeometry = new THREE.BufferGeometry();
  skirtGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(skirt, 3),
  );
  const order = [];
  for (let i = 0; i < 96; i++) {
    const a = i * 2;
    order.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  skirtGeometry.setIndex(order);
  skirtGeometry.computeVertexNormals();
  const soilWall = mesh(
    skirtGeometry,
    new THREE.MeshStandardMaterial({
      color: "#c28a55",
      roughness: 0.88,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  );
  soilWall.castShadow = false;

  // The river along the south edge, with a stone quay wall and steps.
  const river = new THREE.Shape();
  const riverStart = Math.asin((QUAY + 0.3) / LAVENDER_SIZE);
  river.absarc(0, 0, LAVENDER_SIZE, riverStart, Math.PI - riverStart, false);
  river.closePath();
  const water = mesh(
    new THREE.ShapeGeometry(river, 24),
    new THREE.MeshStandardMaterial({
      color: "#6fa9b8",
      roughness: 0.5,
      side: THREE.DoubleSide,
    }),
    0,
    0.03,
    0,
  );
  water.rotation.x = Math.PI / 2;
  water.castShadow = false;
  const wallHalf = Math.sqrt(LAVENDER_SIZE ** 2 - (QUAY + 0.3) ** 2);
  box(wallHalf * 2, 0.36, 0.5, stone, 0, 0.17, QUAY + 0.3);
  box(7, 0.06, 2.6, stone, -5, 0.05, QUAY - 1.1);
  for (const x of [-8.3, -1.7]) {
    cyl(0.14, 0.18, 0.7, "#7a5a3e", x, 0.35, QUAY + 0.1, group, 8);
    blockers.push({ x, z: QUAY + 0.1, r: 0.25 });
  }

  // A gravel path from the quay straight up to the village.
  for (let z = QUAY - 2.4; z > HILL.top - 1; z -= 1) {
    const piece = box(3.6, 0.04, 1.08, gravel, 0, 0, z);
    piece.position.y = hillHeight(0, z) + 0.03;
    piece.rotation.x = Math.atan2(
      hillHeight(0, z - 0.5) - hillHeight(0, z + 0.5),
      1,
    );
  }

  // Lavender rows: rounded purple bushes up the slope, one instanced mesh.
  const bushes = [];
  for (const side of [-1, 1])
    for (let index = 0; index < ROWS.count; index++) {
      const x = side * (ROWS.first + index * ROWS.pitch + ROWS.width / 2);
      for (let z = ROWS.to - 0.35; z > ROWS.from; z -= 0.72)
        if (rowAt(x, z) >= 0 && Math.hypot(x, z) < EDGE - 0.6)
          bushes.push({
            x: x + (rand() - 0.5) * 0.12,
            z,
            size: 0.48 + rand() * 0.1,
          });
    }
  const lavender = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }),
    bushes.length,
  );
  const placed = new THREE.Object3D();
  bushes.forEach(({ x, z, size }, i) => {
    placed.position.set(x, hillHeight(x, z) + size * 0.42, z);
    placed.rotation.set(0, rand() * Math.PI, 0);
    placed.scale.set(size * 1.25, size * 0.9, size);
    placed.updateMatrix();
    lavender.setMatrixAt(i, placed.matrix);
    lavender.setColorAt(i, new THREE.Color(PURPLES[i % PURPLES.length]));
  });
  lavender.name = "lavender-rows";
  lavender.castShadow = false;
  lavender.receiveShadow = true;
  group.add(lavender);

  // A dry-stone wall along the top of the fields.
  for (const side of [-1, 1])
    for (let x = 3; x < 26; x += 1.6) {
      const z = ROWS.from - 1.2;
      const piece = box(1.62, 0.7, 0.6, stone, side * (x + 0.8), 0, z);
      piece.position.y = hillHeight(0, z) + 0.3;
    }
  const wallSeat = at(-6, ROWS.from - 1.2);

  // Cypresses and silver-green olive trees.
  function cypress(x, z, s = 1) {
    const tree = new THREE.Group();
    tree.position.copy(at(x, z));
    group.add(tree);
    cyl(0.12 * s, 0.16 * s, 1 * s, "#6b5a44", 0, 0.5 * s, 0, tree);
    const crown = ball(1, "#3f5f3a", 0, 3.2 * s, 0, tree);
    crown.scale.set(0.75 * s, 2.8 * s, 0.75 * s);
    blockers.push({ x, z, r: 0.6 * s });
    visibility.add(tree);
  }
  function olive(x, z, s = 1) {
    const tree = new THREE.Group();
    tree.position.copy(at(x, z));
    group.add(tree);
    const trunk = cyl(
      0.18 * s,
      0.26 * s,
      1.6 * s,
      "#7a6a55",
      0,
      0.8 * s,
      0,
      tree,
    );
    trunk.rotation.z = 0.15;
    for (let i = 0; i < 4; i++) {
      const leaf = ball(
        0.9 * s,
        "#9aaa7a",
        Math.cos(i * 1.7) * 0.6 * s,
        (1.9 + (i % 2) * 0.3) * s,
        Math.sin(i * 1.7) * 0.6 * s,
        tree,
      );
      leaf.scale.y = 0.7;
    }
    blockers.push({ x, z, r: 0.6 * s });
    visibility.add(tree);
  }
  // Cypresses frame the path at the quay and at the top of the fields.
  for (const z of [22.6, -10.6, -12.6])
    for (const x of [-2.9, 2.9]) cypress(x, z, 0.9 + rand() * 0.2);
  for (const [x, z] of [
    [-29, 6],
    [28, 8],
    [-27, -6],
    [27, -4],
    [-20, 22],
    [21, 21],
  ])
    olive(x, z, 0.9 + rand() * 0.3);

  // The lone oak with a picnic blanket in its shade.
  const oak = new THREE.Group();
  oak.position.copy(at(TREE.x, TREE.z));
  group.add(oak);
  cyl(0.35, 0.5, 2.6, "#6b5a44", 0, 1.3, 0, oak);
  for (let i = 0; i < 6; i++) {
    const leaf = ball(
      1.6,
      i % 2 ? "#6f8f45" : "#7f9f4f",
      Math.cos(i) * 1.4,
      3.4 + (i % 3) * 0.5,
      Math.sin(i) * 1.4,
      oak,
    );
    leaf.scale.y = 0.75;
  }
  blockers.push({ x: TREE.x, z: TREE.z, r: 0.8 });
  visibility.add(oak);
  const blanket = new THREE.Group();
  blanket.position.copy(at(TREE.x, TREE.z + 2.6, 0.02));
  group.add(blanket);
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 4; j++)
      box(
        0.6,
        0.03,
        0.6,
        (i + j) % 2 ? "#f4efe2" : "#c8573f",
        -1.2 + i * 0.6,
        0,
        -0.9 + j * 0.6,
        blanket,
      );
  const basket = new THREE.Group();
  basket.position.set(0, 0, -0.75);
  blanket.add(basket);
  cyl(0.28, 0.24, 0.32, "#b08a5a", 0, 0.16, 0, basket, 8);
  ball(0.12, "#e9a23b", 0.08, 0.36, 0, basket);
  const bread = ball(0.1, "#d4a164", -0.1, 0.36, 0.05, basket);
  bread.scale.set(1.6, 0.8, 0.8);
  basket.visible = false;

  // Sunflowers along the west edge, a hint of the journey's end.
  for (let z = 2; z < 19; z += 1.1)
    for (const dx of [0, 1.2]) {
      const x = -27.5 - dx;
      if (Math.hypot(x, z) > EDGE - 0.8) continue;
      const flower = new THREE.Group();
      flower.position.copy(at(x, z));
      flower.rotation.y = 0.4;
      group.add(flower);
      cyl(0.04, 0.05, 1.8, "#52783e", 0, 0.9, 0, flower);
      const face = cyl(0.3, 0.3, 0.1, "#ffc83d", 0, 1.85, 0.05, flower, 10);
      face.rotation.x = Math.PI / 2;
      const centre = cyl(0.13, 0.13, 0.12, "#684529", 0, 1.85, 0.08, flower, 8);
      centre.rotation.x = Math.PI / 2;
    }

  // The village on the hilltop: ochre and cream houses with terracotta
  // roofs and blue shutters round a fountain square.
  const top = HILL.height;
  const square = new THREE.Vector3(0, top, -21);
  cyl(9.5, 9.5, 0.06, "#ecdcbd", square.x, top + 0.03, square.z, group, 24);
  function house(x, z, width, depth, wall, turn = 0) {
    const home = new THREE.Group();
    home.position.set(x, top, z);
    home.rotation.y = turn;
    group.add(home);
    box(width, 4.2, depth, wall, 0, 2.1, 0, home);
    for (const side of [-1, 1]) {
      const roof = box(
        width / 2 + 0.5,
        0.25,
        depth + 0.6,
        terracotta,
        (side * width) / 4,
        4.75,
        0,
        home,
      );
      roof.rotation.z = -side * 0.42;
    }
    for (const dx of [-width / 4, width / 4])
      for (const y of [1.6, 3.2]) {
        box(0.75, 0.9, 0.08, "#3a3532", dx, y, depth / 2 + 0.02, home);
        for (const leaf of [-1, 1])
          box(
            0.4,
            0.95,
            0.08,
            shutter,
            dx + leaf * 0.6,
            y,
            depth / 2 + 0.05,
            home,
          );
      }
    box(1, 1.9, 0.1, "#7a5a3e", 0, 0.95, depth / 2 + 0.04, home);
    box(1.3, 0.1, 0.6, stone, 0, 2.05, depth / 2 + 0.3, home);
    visibility.add(home);
    const radius = Math.max(width, depth) / 2;
    for (let k = -1; k <= 1; k++) {
      const offset = new THREE.Vector3(k * (width / 3), 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        turn,
      );
      blockers.push({
        x: x + offset.x,
        z: z + offset.z,
        r: Math.min(radius, depth / 2 + 0.6),
      });
    }
    return home;
  }
  house(-15, -30, 7, 5, ochre);
  house(-5.5, -31, 6.5, 5, "#f0e2c6");
  house(16, -29, 7, 5, "#efc9a0");
  house(15.5, -18, 6, 5, ochre, -Math.PI / 2);
  house(15.5, -10.6, 5.5, 4.5, "#f0e2c6", -Math.PI / 2);

  // The fountain in the middle of the square.
  cyl(1.7, 1.9, 0.6, stone, square.x, top + 0.3, square.z, group, 16);
  const pool = cyl(
    1.45,
    1.45,
    0.05,
    "#7fb8c4",
    square.x,
    top + 0.58,
    square.z,
    group,
    16,
  );
  pool.castShadow = false;
  cyl(0.3, 0.4, 1.6, stone, square.x, top + 1.1, square.z, group, 10);
  ball(0.4, stone, square.x, top + 2.0, square.z);
  blockers.push({ x: square.x, z: square.z, r: 2.0 });
  const fountainSpot = new THREE.Vector3(square.x, top, square.z + 2.9);

  // Plane trees shading the square, with café tables beneath.
  for (const [x, z] of [
    [-6.5, -15.5],
    [6.5, -15.5],
    [-6.5, -26.5],
    [6.5, -26.5],
  ]) {
    const plane = new THREE.Group();
    plane.position.set(x, top, z);
    group.add(plane);
    cyl(0.3, 0.38, 3.4, "#c9b99a", 0, 1.7, 0, plane);
    for (let i = 0; i < 5; i++) {
      const leaf = ball(
        1.5,
        i % 2 ? "#7c9a4a" : "#8aa856",
        Math.cos(i * 1.3) * 1.1,
        4.1 + (i % 2) * 0.5,
        Math.sin(i * 1.3) * 1.1,
        plane,
      );
      leaf.scale.y = 0.7;
    }
    blockers.push({ x, z, r: 0.6 });
    visibility.add(plane);
  }
  for (const x of [-3.6, 3.6]) {
    cyl(0.5, 0.5, 0.06, "#f4efe2", x, top + 0.9, -14.6, group, 12);
    cyl(0.06, 0.08, 0.9, "#4b4744", x, top + 0.45, -14.6, group, 6);
    for (const dx of [-0.75, 0.75]) {
      cyl(0.22, 0.22, 0.06, "#c8573f", x + dx, top + 0.55, -14.6, group, 10);
      cyl(0.04, 0.04, 0.55, "#4b4744", x + dx, top + 0.27, -14.6, group, 5);
    }
    blockers.push({ x, z: -14.6, r: 1.1 });
  }

  // Three market stalls along the west side: soap, bread and peaches.
  const stalls = [
    {
      kind: "soap",
      z: -17.4,
      goods: ["#c9b5e0", "#f4e7c8", "#b8d8c0"],
      awning: "#8e6bbf",
    },
    {
      kind: "bread",
      z: -21.4,
      goods: ["#d4a164", "#c48a4a", "#e0b37a"],
      awning: "#c8573f",
    },
    {
      kind: "peaches",
      z: -25.4,
      goods: ["#f2a65a", "#f0b26e", "#e98f4c"],
      awning: "#f2b84b",
    },
  ].map(({ kind, z, goods, awning }) => {
    const stall = new THREE.Group();
    stall.position.set(-9.6, top, z);
    stall.rotation.y = Math.PI / 2;
    group.add(stall);
    box(2.6, 0.12, 1.1, "#a7804f", 0, 0.95, 0, stall);
    for (const dx of [-1.2, 1.2]) {
      box(0.1, 2.3, 0.1, "#6b4a2a", dx, 1.15, -0.45, stall);
      box(0.1, 0.95, 0.1, "#6b4a2a", dx, 0.47, 0.45, stall);
    }
    for (let i = 0; i < 5; i++) {
      const stripe = box(
        0.54,
        0.05,
        1.5,
        i % 2 ? "#f4efe2" : awning,
        -1.08 + i * 0.54,
        2.25,
        0,
        stall,
      );
      stripe.rotation.x = 0.3;
    }
    for (let i = 0; i < 9; i++) {
      const x = -1 + (i % 5) * 0.5,
        dz = i < 5 ? -0.2 : 0.2;
      if (kind === "soap")
        box(0.3, 0.18, 0.22, goods[i % 3], x, 1.1, dz, stall);
      else if (kind === "bread") {
        const loaf = ball(0.18, goods[i % 3], x, 1.12, dz, stall);
        loaf.scale.set(1.5, 0.7, 0.8);
      } else ball(0.15, goods[i % 3], x, 1.14, dz, stall);
    }
    blockers.push({ x: -9.6, z, r: 1.4 });
    visibility.add(stall);
    return { kind, spot: new THREE.Vector3(-7.4, top, z) };
  });

  // The bell tower: a stone campanile with a bell that swings when rung.
  const tower = new THREE.Group();
  tower.position.set(7.5, top, -27.5);
  group.add(tower);
  box(3, 7.4, 3, stone, 0, 3.7, 0, tower);
  box(2.2, 1.9, 3.1, "#3a3532", 0, 6.2, 0, tower);
  box(3.1, 1.9, 2.2, "#3a3532", 0, 6.2, 0, tower);
  for (const dx of [-1.35, 1.35])
    for (const dz of [-1.35, 1.35])
      box(0.3, 2.1, 0.3, stone, dx, 6.25, dz, tower);
  box(3.3, 0.35, 3.3, stone, 0, 7.4, 0, tower);
  const spire = mesh(
    new THREE.ConeGeometry(2.2, 1.6, 4),
    terracotta,
    0,
    8.4,
    0,
    tower,
  );
  spire.rotation.y = Math.PI / 4;
  const bell = new THREE.Group();
  bell.position.set(0, 7.1, 0);
  tower.add(bell);
  mesh(
    new THREE.CylinderGeometry(0.25, 0.6, 0.9, 10),
    "#c9a24b",
    0,
    -0.55,
    0,
    bell,
  );
  ball(0.12, "#8a6a3a", 0, -1.05, 0, bell);
  box(1.4, 0.12, 0.12, "#4b4744", 0, 7.12, 0, tower);
  box(0.9, 1.9, 0.1, "#7a5a3e", 0, 0.95, 1.52, tower);
  blockers.push({ x: 7.5, z: -27.5, r: 2.1 });
  visibility.add(tower);
  const bellSpot = new THREE.Vector3(7.5, top, -25);

  // The striped balloon on the open hilltop to the west, ready to fly to
  // the misty forest.
  const balloon = instantiateModel(context.models.balloon);
  balloon.position.set(-19.5, top, -22);
  group.add(balloon);
  const envelope = balloon.getObjectByName("envelope");
  for (const [dx, dz] of [
    [-2.2, 1.6],
    [2.2, -1.6],
  ]) {
    const rope = cyl(
      0.03,
      0.03,
      2.9,
      "#d8c69a",
      -19.5 + dx / 2,
      top + 0.7,
      -22 + dz / 2,
      group,
      4,
    );
    rope.rotation.set(0.55 * Math.sign(dz), 0, -0.55 * Math.sign(dx));
    cyl(0.1, 0.12, 0.4, "#7a5a3e", -19.5 + dx, top + 0.2, -22 + dz, group, 6);
  }
  blockers.push({ x: -19.5, z: -22, r: 1.3 });
  visibility.add(balloon, {
    meshes: (() => {
      const list = [];
      balloon.traverse((node) => node.isMesh && list.push(node));
      return list;
    })(),
    dynamic: true,
  });
  const balloonTrip = createBalloonTrip(context, {
    balloon,
    destination: "mist",
  });
  const balloonSpot = new THREE.Vector3(-16.9, top, -22);

  // The barge home to the polder waits at the quay.
  const trip = createBargeTrip(context, {
    parent: group,
    mooring: new THREE.Vector3(-5, 0.02, QUAY + 3),
    turn: -Math.PI / 2,
    destination: "polder",
  });
  const quaySpot = new THREE.Vector3(-5, 0, QUAY - 1.2);

  let bellSwing = 0,
    elapsed = 0;
  return {
    group,
    blockers,
    visibility,
    trip,
    balloonTrip,
    balloonSpot,
    bell,
    basket,
    blanket,
    stalls,
    bellSpot,
    quaySpot,
    wallSeat,
    fountainSpot,
    square,
    rowAt,
    contains(x, z) {
      if (Math.hypot(x, z) > EDGE || z > QUAY - 0.3) return false;
      return rowAt(x, z, 0.3) < 0;
    },
    heightAt: hillHeight,
    nearby(position) {
      const near = (spot, reach) =>
        Math.hypot(position.x - spot.x, position.z - spot.z) < reach;
      if (near(quaySpot, 2.4)) return { kind: "barge" };
      if (near(balloonSpot, 2)) return { kind: "balloon" };
      if (near(bellSpot, 2)) return { kind: "bell" };
      if (near(blanket.position, 2.2)) return { kind: "picnic" };
      for (const stall of stalls)
        if (near(stall.spot, 1.6)) return { kind: "market", stall };
      const across = Math.abs(position.x);
      if (
        across > 1.9 &&
        across < 3.1 &&
        position.z > ROWS.from &&
        position.z < ROWS.to
      )
        return { kind: "lavender" };
      return null;
    },
    get bellRinging() {
      return bellSwing > 0;
    },
    ringBell(seconds = 3.5) {
      bellSwing = seconds;
    },
    reset() {
      bellSwing = 0;
      basket.visible = false;
      trip.reset();
      balloonTrip.reset();
    },
    animate(dt) {
      elapsed += dt;
      bellSwing = Math.max(0, bellSwing - dt);
      bell.rotation.x =
        bellSwing > 0
          ? Math.sin(elapsed * 6) * 0.6 * Math.min(1, bellSwing)
          : 0;
      envelope.rotation.z = Math.sin(elapsed * 0.5) * 0.03;
      envelope.position.y = Math.sin(elapsed * 0.7) * 0.08;
      trip.animate(dt);
    },
  };
}
