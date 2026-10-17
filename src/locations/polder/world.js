import * as THREE from "three";
import { instantiateModel } from "../../assets/models.js";
import { createDioramaBase } from "../../rendering/diorama-base.js";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createTreeVisibility } from "../../rendering/tree-visibility.js";
import { createRandom } from "../../systems/random.js";
import { createPolderSign } from "./gate.js";

// Tulip Polder: flat Dutch farmland on a square board. Strips of tulips run
// north towards a canal, a white drawbridge and the windmill, which is the
// first landmark modelled in Blender (assets/blender/build_windmill.py).
export const POLDER_SIZE = 34;
const EDGE = POLDER_SIZE - 1.4;
// The canal crosses the board; only the drawbridge spans it.
const CANAL = { north: -21.6, south: -14.4, bridge: 1.7 };
// Tulip strips: 1.8 wide, 3.2 apart, east and west of the central path, in a
// northern and a southern field split by a cross path.
const STRIP = { first: 4.6, pitch: 3.2, width: 1.8, count: 8 };
const FIELDS = [
  [-9, 2.4],
  [5.6, 22],
];
const TULIP_COLORS = [
  "#e2453c",
  "#f5c842",
  "#f08fb0",
  "#8e5bb5",
  "#f6f0e4",
  "#f08a3c",
  "#d9366f",
  "#f5c842",
];

function stripAt(x, z, margin = 0) {
  if (!FIELDS.some(([from, to]) => z > from - margin && z < to + margin))
    return -1;
  const offset = Math.abs(x) - STRIP.first + margin;
  if (offset < 0) return -1;
  const index = Math.floor(offset / STRIP.pitch);
  if (index >= STRIP.count) return -1;
  return offset - index * STRIP.pitch < STRIP.width + margin * 2 ? index : -1;
}

export function createPolderWorld(context) {
  const group = new THREE.Group();
  group.name = "tulip-polder";
  context.scene.add(group);
  const helpers = createMeshFactory(group);
  const { mesh, box, cyl, ball } = helpers;
  const rand = createRandom(1637);
  const blockers = [];
  const visibility = createTreeVisibility();
  const white = "#f4efe2",
    brick = "#b65a43",
    klinker = "#c79b78";

  createDioramaBase({
    parent: group,
    mesh,
    size: POLDER_SIZE,
    shape: "square",
    top: -0.03,
    grass: "#86b05c",
    soil: "#5e4634",
    stone: "#a88f75",
    rock: "#7b6a58",
    thickness: 0.8,
    seed: 1637,
  });

  // The canal runs right to the board's edge, so its water shows in the
  // board's side like a cut-away model.
  const canalDepth = CANAL.south - CANAL.north;
  const water = box(
    POLDER_SIZE * 2,
    0.5,
    canalDepth,
    "#5f9db3",
    0,
    -0.24,
    (CANAL.north + CANAL.south) / 2,
  );
  water.receiveShadow = true;
  water.castShadow = false;
  for (const z of [CANAL.north, CANAL.south])
    box(POLDER_SIZE * 2, 0.16, 0.35, brick, 0, 0.05, z);

  // Klinker paths: the main path north to the bridge, a cross path between
  // the fields, and towpaths along both banks.
  box(3.4, 0.035, 45, klinker, 0, 0.018, 7.5);
  // The garden path leaves from the south-west corner, out of the opening view.
  box(20, 0.035, 2.8, klinker, -8.3, 0.019, 29.4);
  box(3.4, 0.035, 3.4, klinker, -18, 0.02, 31.2);
  box(60, 0.035, 3, klinker, 0, 0.02, 4);
  box(64, 0.035, 2.6, klinker, 0, 0.022, -12.4);
  box(58, 0.035, 2.4, klinker, 0, 0.022, -23.6);

  // Tulips: one instanced mesh for the blooms, coloured per strip, and one
  // for the stems, above a low band of leaves along each strip.
  const spots = [];
  for (const side of [-1, 1])
    for (let index = 0; index < STRIP.count; index++) {
      const x = side * (STRIP.first + index * STRIP.pitch + STRIP.width / 2);
      const color = new THREE.Color(TULIP_COLORS[index]);
      for (const [from, to] of FIELDS) {
        box(STRIP.width, 0.32, to - from, "#4f7f3a", x, 0.16, (from + to) / 2);
        for (let z = from + 0.25; z < to - 0.1; z += 0.42)
          for (const across of [-0.66, -0.22, 0.22, 0.66])
            spots.push({
              x: x + across + (rand() - 0.5) * 0.12,
              z: z + (rand() - 0.5) * 0.14,
              height: 0.48 + rand() * 0.16,
              color,
            });
      }
    }
  const blooms = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.13, 0.075, 0.24, 6),
    new THREE.MeshStandardMaterial({ roughness: 0.88, flatShading: true }),
    spots.length,
  );
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.022, 0.026, 1, 4),
    helpers.mat("#5d8a40"),
    spots.length,
  );
  const placed = new THREE.Object3D();
  spots.forEach(({ x, z, height, color }, i) => {
    placed.position.set(x, height / 2, z);
    placed.rotation.set(0, rand() * Math.PI, 0);
    placed.scale.set(1, height, 1);
    placed.updateMatrix();
    stems.setMatrixAt(i, placed.matrix);
    placed.position.y = height + 0.1;
    placed.scale.set(1, 1, 1);
    placed.updateMatrix();
    blooms.setMatrixAt(i, placed.matrix);
    blooms.setColorAt(i, color);
  });
  blooms.name = "tulip-blooms";
  stems.name = "tulip-stems";
  for (const tulips of [blooms, stems]) {
    tulips.castShadow = false;
    tulips.receiveShadow = true;
    group.add(tulips);
  }

  // The windmill from Blender stands across the canal, turned a little
  // towards the bridge so the sails face the path.
  const windmill = instantiateModel(context.models.windmill);
  windmill.position.set(-10, 0, -28.2);
  windmill.rotation.y = 0.35;
  group.add(windmill);
  const sails = windmill.getObjectByName("sails");
  const windmillMeshes = [];
  windmill.traverse((node) => node.isMesh && windmillMeshes.push(node));
  visibility.add(windmill, { meshes: windmillMeshes, dynamic: true });
  blockers.push({ x: -10, z: -28.2, r: 3.5 });
  const windmillSpot = new THREE.Vector3(
    -10 + Math.sin(0.35) * 4.6,
    0,
    -28.2 + Math.cos(0.35) * 4.6,
  );

  // A white drawbridge with a portal frame and balance beams.
  const bridge = new THREE.Group();
  bridge.name = "polder-drawbridge";
  bridge.position.set(0, 0, (CANAL.north + CANAL.south) / 2);
  group.add(bridge);
  box(4, 0.2, canalDepth + 1.6, "#8a6a4c", 0, 0.1, 0, bridge);
  for (const side of [-1, 1]) {
    box(0.12, 0.6, canalDepth + 1.4, white, side * 1.95, 0.55, 0, bridge);
    for (let i = 0; i < 5; i++)
      box(0.1, 0.5, 0.1, white, side * 1.95, 0.35, -3.2 + i * 1.6, bridge);
    box(0.32, 5.4, 0.32, white, side * 2.4, 2.7, -4.6, bridge);
    box(0.24, 0.24, 9.2, white, side * 2.4, 5.5, -1.2, bridge);
    cyl(0.025, 0.025, 5.2, "#4b4b4b", side * 2.1, 2.9, 3.2, bridge, 4);
    blockers.push({ x: side * 2.4, z: bridge.position.z - 4.6, r: 0.35 });
  }
  box(5.2, 0.3, 0.3, white, 0, 5.4, -4.6, bridge);
  box(5.2, 0.24, 0.24, white, 0, 5.5, 3.3, bridge);
  box(4.6, 0.7, 0.9, "#4a5a4c", 0, 5.2, -5.6, bridge);

  // A brick farmhouse with a stepped gable and green shutters.
  const farm = new THREE.Group();
  farm.name = "polder-farmhouse";
  farm.position.set(13, 0, -28.6);
  group.add(farm);
  box(8, 3.2, 6, brick, 0, 1.6, 0, farm);
  for (const side of [-1, 1]) {
    const slope = box(4.9, 0.3, 6.6, "#8d7a5c", side * 2.05, 4.35, 0, farm);
    slope.rotation.z = -side * 0.66;
  }
  for (let step = 0; step < 4; step++) {
    const width = 8 - step * 1.9;
    box(width, 0.9, 0.4, brick, 0, 3.6 + step * 0.9, 3.05, farm);
    box(width + 0.15, 0.12, 0.5, white, 0, 4.05 + step * 0.9, 3.05, farm);
  }
  box(1.1, 2, 0.2, "#3f5c4c", 0, 1, 3.05, farm);
  for (const side of [-1, 1]) {
    box(1.1, 1.2, 0.12, "#f2cf86", side * 2.4, 1.9, 3.06, farm);
    box(1.3, 1.4, 0.08, white, side * 2.4, 1.9, 3.02, farm);
    for (const leaf of [-1, 1])
      box(0.5, 1.3, 0.1, "#3f6b4f", side * 2.4 + leaf * 0.85, 1.9, 3.1, farm);
  }
  visibility.add(farm);
  for (const [x, z] of [
    [10.6, -27],
    [15.4, -27],
    [10.6, -30.2],
    [15.4, -30.2],
  ])
    blockers.push({ x, z, r: 2.1 });

  // Two cows graze beside the farm.
  function cow(x, z, turn) {
    const body = new THREE.Group();
    body.position.set(x, 0, z);
    body.rotation.y = turn;
    group.add(body);
    box(0.75, 0.75, 1.7, white, 0, 1.05, 0, body);
    box(0.78, 0.5, 0.6, "#2d2a28", 0, 1.15, 0.2, body);
    box(0.5, 0.4, 0.5, "#2d2a28", 0.15, 1.3, -0.55, body);
    box(0.45, 0.5, 0.55, white, 0, 1.15, 1.05, body);
    box(0.47, 0.22, 0.2, "#e7a7a0", 0, 0.98, 1.36, body);
    for (const [lx, lz] of [
      [-0.25, -0.6],
      [0.25, -0.6],
      [-0.25, 0.6],
      [0.25, 0.6],
    ])
      box(0.16, 0.7, 0.16, "#3a3532", lx, 0.35, lz, body);
    blockers.push({ x, z, r: 1.1 });
  }
  cow(23.5, -26.5, 0.7);
  cow(26.5, -30, -1.9);

  // Columnar poplars line the board's east and west edges and the far bank.
  function poplar(x, z, s = 1) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    group.add(tree);
    cyl(0.12 * s, 0.18 * s, 1.6 * s, "#6b5a44", 0, 0.8 * s, 0, tree);
    const crown = ball(
      1,
      rand() > 0.5 ? "#5f8f45" : "#6f9b4c",
      0,
      3.9 * s,
      0,
      tree,
    );
    crown.scale.set(0.95 * s, 2.8 * s, 0.95 * s);
    blockers.push({ x, z, r: 0.5 * s });
    visibility.add(tree);
  }
  for (let z = -30; z <= 30; z += 4.2)
    for (const x of [-EDGE + 0.4, EDGE - 0.4])
      if (z < CANAL.north - 0.8 || z > CANAL.south + 0.8)
        poplar(x, z + (rand() - 0.5), 0.85 + rand() * 0.3);
  for (const x of [-22, -18, 2, 5])
    poplar(x, -EDGE + 0.4 + rand() * 0.6, 0.9 + rand() * 0.25);

  // A bicycle, or a tandem, with the front wheel towards local +Z.
  function bicycle(parent, x, z, turn, color, tandem = false) {
    const bike = new THREE.Group();
    bike.position.set(x, 0, z);
    bike.rotation.y = turn;
    parent.add(bike);
    const length = tandem ? 1.9 : 1.1;
    for (const end of [-1, 1]) {
      const wheel = mesh(
        new THREE.TorusGeometry(0.34, 0.035, 5, 14),
        "#2f2f2f",
        0,
        0.36,
        (end * length) / 2,
        bike,
      );
      wheel.rotation.y = Math.PI / 2;
    }
    box(0.06, 0.06, length, color, 0, 0.62, 0, bike);
    for (const seat of tandem ? [-0.55, 0.3] : [-0.15]) {
      box(0.06, 0.4, 0.06, color, 0, 0.8, seat, bike);
      box(0.18, 0.06, 0.28, "#3b2e26", 0, 1.02, seat, bike);
    }
    box(0.06, 0.55, 0.06, color, 0, 0.8, length / 2 - 0.12, bike);
    box(0.55, 0.05, 0.05, "#2f2f2f", 0, 1.08, length / 2 - 0.12, bike);
    box(0.32, 0.18, 0.26, "#a77b4f", 0, 0.98, length / 2 + 0.08, bike);
    return bike;
  }

  // The bike shed by the entrance, with a tandem waiting outside.
  const shed = new THREE.Group();
  shed.name = "polder-bike-shed";
  shed.position.set(-9, 0, 26.5);
  group.add(shed);
  box(5, 2.4, 0.2, "#6f8f7c", 0, 1.2, -1.2, shed);
  for (const side of [-1, 1]) {
    box(0.2, 2.4, 2.6, "#6f8f7c", side * 2.4, 1.2, 0, shed);
    box(0.18, 2.3, 0.18, white, side * 2.4, 1.15, 1.25, shed);
  }
  const shedRoof = box(5.6, 0.18, 3.2, "#c8573f", 0, 2.55, 0.05, shed);
  shedRoof.rotation.x = -0.12;
  bicycle(shed, -1, -0.2, Math.PI / 2, "#2f5f8a");
  bicycle(shed, 1, 0.1, Math.PI / 2 + 0.2, "#c8573f");
  bicycle(group, -5.2, 24.6, -0.25, "#e5b13d", true);
  visibility.add(shed);
  blockers.push(
    { x: -10.4, z: 26.3, r: 1.4 },
    { x: -7.6, z: 26.3, r: 1.4 },
    { x: -5.2, z: 24.6, r: 0.9 },
  );

  // Giant yellow clogs to sit in for a photo.
  function clog(x, z, turn) {
    const shoe = new THREE.Group();
    shoe.position.set(x, 0, z);
    shoe.rotation.y = turn;
    group.add(shoe);
    const toe = ball(1, "#f2c14e", 0, 0.55, 0.5, shoe);
    toe.scale.set(0.8, 0.55, 1.35);
    box(1.4, 1, 1.5, "#f2c14e", 0, 0.5, -0.65, shoe);
    box(1.05, 0.06, 1.15, "#6b4a2a", 0, 1.01, -0.6, shoe);
    ball(0.17, "#d9366f", 0.42, 0.85, 0.9, shoe);
    ball(0.17, "#d9366f", -0.42, 0.85, 0.9, shoe);
    blockers.push({ x, z, r: 1.3 });
  }
  clog(7.4, 27, -0.35);
  clog(10.2, 26.4, -0.15);

  // A cheese cart beside the bridge, under a striped awning.
  const cart = new THREE.Group();
  cart.name = "polder-cheese-cart";
  cart.position.set(-6.4, 0, -10.4);
  group.add(cart);
  box(2.6, 0.2, 1.4, "#8a6a4c", 0, 0.75, 0, cart);
  for (const side of [-1, 1]) {
    const wheel = cyl(
      0.45,
      0.45,
      0.12,
      "#6b4a2a",
      side * 0.9,
      0.45,
      0.78,
      cart,
      10,
    );
    wheel.rotation.x = Math.PI / 2;
    box(0.1, 1.7, 0.1, white, side * 1.2, 1.7, -0.6, cart);
  }
  for (let i = 0; i < 5; i++) {
    const cheese = cyl(
      0.32,
      0.32,
      0.22,
      i % 2 ? "#f2b84b" : "#e9a23b",
      -0.8 + (i % 3) * 0.75,
      0.96 + Math.floor(i / 3) * 0.22,
      -0.15 + (i % 2) * 0.3,
      cart,
      10,
    );
    cheese.rotation.y = i;
  }
  for (let i = 0; i < 6; i++)
    box(
      0.48,
      0.06,
      1.5,
      i % 2 ? white : "#c8573f",
      -1.2 + i * 0.48,
      2.6,
      -0.1,
      cart,
    ).rotation.x = 0.25;
  blockers.push({ x: -6.4, z: -10.4, r: 1.5 });

  // The bench sits at the edge of the cross path facing south, so a photo
  // of the pair on it has the tulip strips and the windmill behind them.
  const bench = instantiateModel(context.models.bench);
  bench.position.set(-9.2, 0, 3.2);
  group.add(bench);
  blockers.push({ x: -10.1, z: 3.2, r: 0.8 }, { x: -8.3, z: 3.2, r: 0.8 });

  // A flower stall near the entrance: buckets of cut tulips and an
  // honesty box, as at Dutch farm gates.
  const stall = new THREE.Group();
  stall.name = "polder-tulip-stall";
  stall.position.set(8.6, 0, 20.6);
  stall.rotation.y = -0.2;
  group.add(stall);
  box(3.4, 0.16, 1.2, "#8a6a4c", 0, 0.9, 0, stall);
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      box(0.12, 0.9, 0.12, "#6b4a2a", side * 1.55, 0.45, end * 0.5, stall);
  box(3.4, 0.9, 0.1, white, 0, 1.4, -0.55, stall);
  for (let i = 0; i < 5; i++) {
    const x = -1.3 + i * 0.65;
    cyl(0.24, 0.18, 0.38, "#9fb3bf", x, 1.17, 0.1, stall, 8);
    for (let j = 0; j < 6; j++)
      ball(
        0.09,
        TULIP_COLORS[(i * 2 + 1) % TULIP_COLORS.length],
        x + Math.cos(j) * 0.12,
        1.48 + (j % 2) * 0.08,
        0.1 + Math.sin(j) * 0.12,
        stall,
      );
  }
  box(0.5, 0.45, 0.4, "#2f5f8a", 1.95, 1.18, 0.1, stall);
  blockers.push({ x: 8.6, z: 20.6, r: 1.8 });

  // Ducks paddle along the canal; fed, they swim over to the bank.
  const ducks = Array.from({ length: 5 }, (_, i) => {
    const duck = new THREE.Group();
    group.add(duck);
    const drake = i % 2 === 0;
    const body = ball(0.3, drake ? "#e9e2d2" : "#9b7a58", 0, 0.12, 0, duck);
    body.scale.set(0.8, 0.6, 1.2);
    ball(0.17, drake ? "#2f6b4a" : "#8a6a4c", 0, 0.38, 0.28, duck);
    const beak = box(0.1, 0.05, 0.16, "#f0a03a", 0, 0.36, 0.46, duck);
    beak.castShadow = false;
    const home = -24 + i * 11 + rand() * 4,
      z = -18 + (rand() - 0.5) * 3;
    duck.position.set(home, 0, z);
    return {
      duck,
      home,
      z,
      phase: rand() * Math.PI * 2,
      speed: 0.25 + rand() * 0.15,
    };
  });
  let feedX = null,
    feedLeft = 0;

  const entranceGate = createPolderSign({
    parent: context.garden,
    helpers,
    x: -23,
    z: -25,
    text: "TULPENPOLDER",
    subtitle: "TULIP POLDER · WALK THROUGH / X",
  });
  entranceGate.group.name = "polder-garden-entrance";
  context.blockers.push(...entranceGate.blockers);
  context.companionObstacles.push(...entranceGate.blockers);
  context.treeVisibility.add(entranceGate.group);
  const returnGate = createPolderSign({
    parent: group,
    helpers,
    x: -18,
    z: 30.6,
    text: "GARDEN PATH",
    subtitle: "TERUG NAAR DE TUIN · WALK THROUGH / X",
  });
  returnGate.group.name = "polder-return-gate";
  visibility.add(returnGate.group);
  blockers.push(...returnGate.blockers);

  let windSpeed = 0.6,
    gustLeft = 0,
    elapsed = 0;
  return {
    group,
    blockers,
    entranceGate,
    returnGate,
    windmill,
    sails,
    windmillSpot,
    visibility,
    stripAt,
    contains(x, z) {
      if (Math.abs(x) > EDGE || Math.abs(z) > EDGE) return false;
      if (z > CANAL.north && z < CANAL.south) return Math.abs(x) < CANAL.bridge;
      return stripAt(x, z, 0.3) < 0;
    },
    heightAt: () => 0,
    nearby(position) {
      if (position.distanceTo(windmillSpot) < 3) return "windmill";
      if (
        position.z > CANAL.south &&
        position.z < CANAL.south + 2.6 &&
        Math.abs(position.x) > 2.6 &&
        Math.abs(position.x) < 28
      )
        return "ducks";
      return null;
    },
    get gusting() {
      return gustLeft > 0;
    },
    get feeding() {
      return feedLeft > 0;
    },
    gust(seconds = 5) {
      gustLeft = seconds;
    },
    feedDucks(x, seconds = 7) {
      feedX = x;
      feedLeft = seconds;
    },
    reset() {
      gustLeft = 0;
      feedLeft = 0;
      windSpeed = 0.6;
    },
    animate(dt) {
      elapsed += dt;
      gustLeft = Math.max(0, gustLeft - dt);
      feedLeft = Math.max(0, feedLeft - dt);
      windSpeed +=
        ((gustLeft > 0 ? 2.6 : 0.6) - windSpeed) * (1 - Math.exp(-dt * 1.5));
      sails.rotation.z += windSpeed * dt;
      ducks.forEach((d, i) => {
        const wander = d.home + Math.sin(elapsed * d.speed + d.phase) * 4;
        const targetX = feedLeft > 0 ? feedX + (i - 2) * 0.9 : wander;
        const targetZ = feedLeft > 0 ? CANAL.south - 0.9 - (i % 2) * 0.6 : d.z;
        const step = 1 - Math.exp(-dt * (feedLeft > 0 ? 1.2 : 0.6));
        const dx = (targetX - d.duck.position.x) * step,
          dz = (targetZ - d.duck.position.z) * step;
        d.duck.position.x += dx;
        d.duck.position.z += dz;
        if (Math.hypot(dx, dz) > 1e-4) d.duck.rotation.y = Math.atan2(dx, dz);
        d.duck.position.y = Math.sin(elapsed * 2 + d.phase) * 0.03;
      });
    },
  };
}
