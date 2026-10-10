import * as THREE from "three";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createTreeVisibility } from "../../rendering/tree-visibility.js";
import { createRandom } from "../../systems/random.js";
import { createWinterSign, createWinterLabel } from "./gate.js";
import { snowballPose } from "./snowman-building.js";

// Lumeküla is an imagined Estonian village, with timber homes, limestone,
// a smoke sauna and a flat, wooded landscape rather than alpine peaks.
export function createWinterWorld(context) {
  const group = new THREE.Group();
  group.name = "lumekula-estonian-winter-village";
  context.scene.add(group);
  const helpers = createMeshFactory(group);
  const { mesh, box, cyl, ball } = helpers;
  const rand = createRandom(731);
  const blockers = [];
  const visibility = createTreeVisibility();
  const snow = "#e8f0f5",
    wood = "#69584a",
    trim = "#eee2ca";
  const warm = new THREE.MeshStandardMaterial({
    color: "#ffd495",
    emissive: "#ffb656",
    emissiveIntensity: 0.8,
    roughness: 0.5,
  });
  cyl(43, 45, 1.8, "#a6bdc9", 0, -0.95, 0, group, 96);
  cyl(43, 43, 0.15, snow, 0, -0.07, 0, group, 96);
  box(5.5, 0.035, 58, "#c9dbe5", 0, 0.02, 2);
  box(35, 0.035, 4, "#c9dbe5", 1, 0.025, 3);

  const entranceGate = createWinterSign({
    parent: context.garden,
    helpers,
    x: 23,
    z: -25,
    text: "LUMEKÜLA · EESTI",
    subtitle: "ESTONIAN WINTER VILLAGE · WALK THROUGH / X",
  });
  entranceGate.group.name = "winter-garden-entrance";
  context.blockers.push(...entranceGate.blockers);
  context.companionObstacles.push(...entranceGate.blockers);
  const returnGate = createWinterSign({
    parent: group,
    helpers,
    x: 0,
    z: 30,
    text: "GARDEN PATH",
    subtitle: "TAGASI AEDA · WALK THROUGH / X",
  });
  returnGate.group.name = "winter-return-gate";
  visibility.add(returnGate.group);
  context.treeVisibility.add(entranceGate.group);
  blockers.push(...returnGate.blockers);

  const chimneyTops = [];
  function roof(parent, width, depth, wallHeight, rise = 2) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
    });
    mesh(geometry, "#655b56", 0, wallHeight, -depth / 2, parent);
    for (const side of [-1, 1]) {
      const cap = box(
        Math.hypot(width / 2, rise) + 0.2,
        0.23,
        depth + 0.4,
        snow,
        (side * width) / 4,
        wallHeight + rise / 2 + 0.12,
        0,
        parent,
      );
      cap.rotation.z = -side * Math.atan2(rise, width / 2);
    }
  }
  function window(parent, x, y, z, w = 1.25, h = 1.35) {
    box(w + 0.25, h + 0.25, 0.18, trim, x, y, z, parent);
    box(w, h, 0.04, warm, x, y, z + 0.11, parent);
    box(0.07, h, 0.06, trim, x, y, z + 0.15, parent);
    box(w, 0.07, 0.06, trim, x, y, z + 0.15, parent);
    box(w + 0.4, 0.12, 0.4, snow, x, y - h / 2 - 0.13, z + 0.12, parent);
  }
  function cottage(x, z, color, name, width = 6, depth = 5) {
    const home = new THREE.Group();
    home.name = name;
    home.position.set(x, 0, z);
    group.add(home);
    box(width + 0.2, 0.55, depth + 0.15, "#a5aaa9", 0, 0.26, 0, home);
    box(width, 3.2, depth, color, 0, 1.95, 0, home);
    for (let i = 0; i < 12; i++)
      box(
        width + 0.05,
        0.035,
        depth + 0.04,
        "#817b6c",
        0,
        0.6 + i * 0.25,
        0,
        home,
      );
    for (const side of [-1, 1])
      box(
        0.17,
        3.2,
        depth + 0.1,
        trim,
        side * (width / 2 - 0.1),
        1.95,
        0,
        home,
      );
    roof(home, width + 0.55, depth + 0.6, 3.6, 1.8);
    for (const side of [-1, 1])
      window(home, side * width * 0.3, 2, depth / 2 + 0.02);
    box(1, 2.2, 0.15, "#41585e", 0, 1.4, depth / 2 + 0.1, home);
    ball(0.055, "#dab675", 0.3, 1.4, depth / 2 + 0.2, home);
    box(1.6, 0.2, 0.8, snow, 0, 0.1, depth / 2 + 0.35, home);
    box(0.55, 2.1, 0.65, "#89796a", 1.5, 4.6, -0.65, home);
    box(0.7, 0.15, 0.8, snow, 1.5, 5.7, -0.65, home);
    chimneyTops.push(new THREE.Vector3(x + 1.5, 5.8, z - 0.65));
    // A row of round contacts preserves access around rectangular walls.
    for (let dx = -width / 2 + 1; dx <= width / 2 - 1; dx += 1.5)
      for (const dz of [-depth / 2 + 1, depth / 2 - 1])
        blockers.push({ x: x + dx, z: z + dz, r: 1.45 });
    visibility.add(home);
    return home;
  }
  const cafe = cottage(-12, -11, "#c3a65f", "wooden-village-cafe", 7, 5.5);
  createWinterLabel({
    parent: cafe,
    helpers,
    text: "KOHVIK · SOE KAKAO",
    x: 0,
    y: 3.1,
    z: 2.91,
    width: 4.4,
  });
  cottage(-25, 9, "#9b6055", "ochre-red-timber-house");
  cottage(-23, -26, "#8eacaa", "sage-timber-house");
  cottage(11, -22, "#9a855d", "ochre-timber-house");
  cottage(28, 15, "#7c919f", "blue-grey-timber-house");
  const sauna = cottage(28, -22, "#75604d", "log-smoke-sauna", 5, 4);
  for (let i = 0; i < 12; i++) {
    const log = cyl(
      0.13,
      0.13,
      5.3,
      i % 2 ? "#75604d" : "#8a7158",
      0,
      0.62 + i * 0.24,
      2.02,
      sauna,
    );
    log.rotation.z = Math.PI / 2;
  }
  createWinterLabel({
    parent: sauna,
    helpers,
    text: "SAUN",
    x: 0,
    y: 3.05,
    z: 2.16,
    width: 2,
  });
  // A modest limestone church and slender steeple at the end of the lane.
  const church = new THREE.Group();
  church.name = "limestone-village-church";
  church.position.set(-2, 0, -29);
  group.add(church);
  box(7, 5, 8, "#c6c5b8", 0, 2.5, 0, church);
  roof(church, 7.5, 8.5, 5, 2.7);
  box(2.6, 8, 2.7, "#d2d0c3", 0, 4, 4, church);
  cyl(0, 2.1, 5, "#55626b", 0, 10.5, 4, church, 4).rotation.y = Math.PI / 4;
  cyl(0.055, 0.055, 1, trim, 0, 13.4, 4, church);
  box(0.65, 0.06, 0.06, trim, 0, 13.6, 4, church);
  window(church, 0, 5.8, 5.37, 0.75, 1.5);
  box(1.15, 2.5, 0.1, "#615646", 0, 1.25, 5.41, church);
  for (const side of [-1, 1]) window(church, side * 2.3, 2.8, 4.05, 0.85, 1.7);
  for (const dx of [-2.2, 0, 2.2])
    for (const dz of [-2.7, 0, 2.7])
      blockers.push({ x: -2 + dx, z: -29 + dz, r: 1.8 });
  blockers.push({ x: -2, z: -24.5, r: 1.5 });
  visibility.add(church);

  // The Estonian flag, displayed horizontally in blue, black and white.
  cyl(0.045, 0.075, 6, "#8a939a", 4.5, 3, -23);
  for (const [i, color] of ["#4899d7", "#202329", "#ffffff"].entries())
    box(2, 0.43, 0.025, color, 5.5, 5.7 - i * 0.43, -23);
  blockers.push({ x: 4.5, z: -23, r: 0.15 });

  const pond = { center: new THREE.Vector3(17, 0, -4), rx: 7, rz: 9 };
  const ice = cyl(
    1,
    1,
    0.09,
    new THREE.MeshStandardMaterial({
      color: "#93c6df",
      metalness: 0.22,
      roughness: 0.28,
      emissive: "#284d70",
      emissiveIntensity: 0.2,
    }),
    17,
    0.045,
    -4,
    group,
    72,
  );
  ice.name = "frozen-skating-pond";
  ice.scale.set(pond.rx, 1, pond.rz);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const drift = ball(
      0.65,
      snow,
      17 + Math.cos(a) * 7.5,
      0.2,
      -4 + Math.sin(a) * 9.5,
    );
    drift.scale.set(1.25, 0.5, 1.25);
  }
  for (let i = 0; i < 8; i++) {
    const glint = box(
      1.2 + rand(),
      0.006,
      0.045,
      "#dbf0fa",
      14 + rand() * 6,
      0.095,
      -9 + rand() * 9,
    );
    glint.rotation.y = -0.4;
  }
  const skateSpot = new THREE.Vector3(17, 0, 7);
  cyl(0.05, 0.08, 1.5, wood, 20, 0.75, 7.5);
  createWinterLabel({
    parent: group,
    helpers,
    text: "UISUTAMA · SKATE",
    x: 20,
    y: 1.7,
    z: 7.55,
    width: 3,
  });
  // Low boardwalk through snowy reeds around the pond's east bank.
  for (let i = 0; i < 32; i++) {
    const a = -1.2 + (i / 31) * 2.5;
    const plank = box(
      2,
      0.11,
      1.15,
      i % 2 ? "#9a8876" : "#b09c86",
      17 + Math.cos(a) * 10,
      0.08,
      -4 + Math.sin(a) * 12,
    );
    plank.rotation.y = -a;
    if (i % 4 === 0) {
      cyl(
        0.05,
        0.07,
        1.1,
        wood,
        17 + Math.cos(a) * 11.2,
        0.55,
        -4 + Math.sin(a) * 13.2,
      );
    }
  }
  for (let i = 0; i < 45; i++) {
    const a = rand() * Math.PI * 2;
    const x = 17 + Math.cos(a) * (8.3 + rand()),
      z = -4 + Math.sin(a) * (10.4 + rand());
    cyl(0.018, 0.028, 0.7 + rand() * 0.5, "#b0a58f", x, 0.4, z, group, 4);
  }

  const cocoaSpot = new THREE.Vector3(-12, 0, -5.2);
  const bench = new THREE.Group();
  bench.name = "cafe-winter-bench";
  bench.position.copy(cocoaSpot);
  group.add(bench);
  box(4, 0.2, 1.15, wood, 0, 0.9, 0, bench);
  box(4, 0.7, 0.16, "#997c5c", 0, 1.5, -0.5, bench);
  box(4.15, 0.1, 0.3, snow, 0, 1.88, -0.5, bench);
  for (const side of [-1, 1])
    box(0.18, 0.9, 0.9, wood, side * 1.55, 0.45, 0, bench);
  blockers.push({ x: -13.2, z: -5.2, r: 0.65 }, { x: -10.8, z: -5.2, r: 0.65 });
  createWinterLabel({
    parent: group,
    helpers,
    text: "SOE KAKAO · WARM COCOA",
    x: -12,
    y: 2.7,
    z: -5.7,
    width: 4,
  });
  for (const x of [-14.2, -9.8]) cyl(0.06, 0.1, 3.1, wood, x, 1.55, -5.7);
  box(4.7, 0.12, 0.4, snow, -12, 3.14, -5.7);
  const table = new THREE.Group();
  table.name = "cafe-gingerbread-table";
  table.position.set(-15.5, 0, -4.8);
  group.add(table);
  cyl(0.55, 0.55, 0.12, "#9a7b57", 0, 1.1, 0, table, 16);
  cyl(0.1, 0.16, 1.05, wood, 0, 0.52, 0, table);
  cyl(0.4, 0.4, 0.035, trim, 0, 1.18, 0, table, 16);
  for (const side of [-1, 1]) {
    const cookie = cyl(
      0.12,
      0.12,
      0.035,
      "#b97642",
      side * 0.17,
      1.215,
      0,
      table,
      6,
    );
    cookie.rotation.y = side * 0.3;
  }
  blockers.push({ x: -15.5, z: -4.8, r: 0.55 });

  const snowman = new THREE.Group();
  snowman.name = "build-a-snowman";
  snowman.position.set(-7, 0, 6);
  group.add(snowman);
  const parts = Array.from({ length: 3 }, () => new THREE.Group());
  parts.forEach((part, i) => {
    part.name = `snowman-snowball-${i}`;
  });
  snowman.add(...parts);
  ball(0.9, snow, 0, 0, 0, parts[0]);
  ball(0.66, snow, 0, 0, 0, parts[1]);
  ball(0.46, snow, 0, 0, 0, parts[2]);
  const finishing = ["face", "arms", "scarf", "hat"].map((name) => {
    const detail = new THREE.Group();
    detail.name = `snowman-${name}`;
    snowman.add(detail);
    return detail;
  });
  const [face, arms, scarf, hat] = finishing;
  for (const side of [-1, 1]) {
    ball(0.055, "#39444e", side * 0.15, 2.93, 0.41, face);
    const arm = cyl(0.035, 0.06, 1.1, wood, side * 0.95, 2.03, 0, arms);
    arm.rotation.z = side * 0.95;
  }
  const carrot = cyl(0.015, 0.1, 0.43, "#d7914b", 0, 2.8, 0.57, face);
  carrot.rotation.x = Math.PI / 2;
  for (const y of [1.8, 2.15]) ball(0.075, "#39444e", 0, y, 0.64, scarf);
  cyl(0.49, 0.49, 0.12, "#4782a3", 0, 2.47, 0, scarf, 16);
  box(0.22, 0.65, 0.1, "#4782a3", 0.3, 2.15, 0.62, scarf);
  cyl(0.4, 0.4, 0.12, "#43515b", 0, 3.21, 0, hat, 16);
  cyl(0.27, 0.29, 0.43, "#43515b", 0, 3.43, 0, hat, 12);
  const supplies = new THREE.Group();
  snowman.add(supplies);
  for (const side of [-1, 1]) ball(0.3, snow, side * 1.4, 0.23, 0.5, supplies);
  const snowmanSign = new THREE.Group();
  snowmanSign.name = "snowman-activity-sign";
  snowmanSign.position.set(-11, 0, 4.2);
  group.add(snowmanSign);
  createWinterLabel({
    parent: snowmanSign,
    helpers,
    text: "LUMEMEMM · SNOWMAN",
    x: 0,
    y: 1.8,
    z: 0,
    width: 3.5,
  });
  cyl(0.055, 0.09, 2.15, wood, 0, 1.07, -0.05, snowmanSign);
  box(3.7, 0.1, 0.3, snow, 0, 2.18, -0.05, snowmanSign);
  visibility.add(snowmanSign);
  let snowmanStage = 0;
  function syncSnowman(preview = null) {
    parts.forEach((part, i) => {
      const assembling = i === snowmanStage && preview !== null;
      part.visible = i < snowmanStage || assembling;
      part.position.set(0, [0.8, 1.94, 2.84][i], 0);
      part.scale.setScalar(1);
      part.rotation.set(0, 0, 0);
      if (assembling) {
        const pose = snowballPose(i, preview);
        part.position.copy(pose.position);
        part.scale.setScalar(pose.scale);
        part.rotation.set(-pose.rolling * 0.6, 0, -pose.rolling * 0.8);
      }
    });
    finishing.forEach((detail, i) => {
      const placement = [0.72, 0.78, 0.84, 0.9][i];
      const placing =
        snowmanStage === 2 && preview !== null && preview >= placement;
      detail.visible = snowmanStage === 3 || placing;
      detail.position.set(0, 0, 0);
      if (placing) {
        const transfer =
          1 - THREE.MathUtils.smoothstep(preview, placement, placement + 0.07);
        detail.position.set(
          transfer * 0.9,
          -transfer * (i === 3 ? 0.8 : 0.15),
          transfer * 0.65,
        );
      }
    });
    supplies.visible = snowmanStage < 3;
  }
  syncSnowman();
  blockers.push({ x: -7, z: 6, r: 1 });

  function spruce(x, z, scale) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    group.add(tree);
    cyl(0.13, 0.25, 3, wood, 0, 1.5, 0, tree);
    for (let tier = 0; tier < 3; tier++) {
      const r = 1.8 - tier * 0.38,
        y = 2.2 + tier * 1.3;
      cyl(0, r, 2.8, "#3f6465", 0, y, 0, tree, 8);
      cyl(0, r * 0.91, 2.3, snow, 0, y + 0.32, 0, tree, 8);
    }
    blockers.push({ x, z, r: 0.3 * scale });
    visibility.add(tree);
  }
  function birch(x, z) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    group.add(tree);
    cyl(0.09, 0.18, 5, "#e6e1d7", 0, 2.5, 0, tree);
    for (let i = 0; i < 7; i++)
      box(
        0.18,
        0.07,
        0.2,
        "#5e6467",
        i % 2 ? 0.04 : -0.04,
        0.65 + i * 0.55,
        0,
        tree,
      );
    for (const side of [-1, 1]) {
      const branch = cyl(0.035, 0.08, 2.8, "#dadfdc", side * 0.7, 4.5, 0, tree);
      branch.rotation.z = side * -0.55;
    }
    blockers.push({ x, z, r: 0.22 });
    visibility.add(tree);
  }
  for (let i = 0; i < 85; i++) {
    const a = rand() * Math.PI * 2,
      r = 33 + rand() * 9;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (
      Math.abs(x) < 5 ||
      blockers.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2.5)
    )
      continue;
    if (i % 5 === 0) birch(x, z);
    else spruce(x, z, 0.7 + rand() * 0.7);
  }
  for (const [x, z] of [
    [-19, -4],
    [-19, 18],
    [9, 17],
    [-13, 24],
    [8, -12],
    [33, -8],
  ])
    spruce(x, z, 0.95);

  // Low split-rail fences, capped in snow, leave the main street open.
  for (const [x, z, length] of [
    [-26, 15, 9],
    [-24, -19, 8],
    [28, 21, 8],
  ]) {
    for (let i = 0; i <= 4; i++) {
      cyl(0.07, 0.12, 1.2, wood, x - length / 2 + (i * length) / 4, 0.6, z);
      ball(0.15, snow, x - length / 2 + (i * length) / 4, 1.23, z);
      blockers.push({ x: x - length / 2 + (i * length) / 4, z, r: 0.32 });
    }
    for (const y of [0.5, 1]) box(length, 0.13, 0.12, wood, x, y, z);
    box(length, 0.08, 0.2, snow, x, 1.1, z);
  }
  const lamps = [];
  for (const [x, z] of [
    [-4, 17],
    [4, 4],
    [-4, -14],
    [12, 7],
    [-15, -4],
  ]) {
    cyl(0.055, 0.09, 3.4, "#445965", x, 1.7, z);
    box(0.45, 0.65, 0.45, warm, x, 3.35, z);
    cyl(0, 0.48, 0.4, "#47545b", x, 3.88, z, group, 4).rotation.y = Math.PI / 4;
    for (const side of [-1, 1])
      box(0.045, 0.75, 0.51, "#47545b", x + side * 0.24, 3.35, z);
    blockers.push({ x, z, r: 0.2 });
    if (lamps.length < 2) {
      const light = new THREE.PointLight("#ffc580", 5, 8);
      light.position.set(x, 3.2, z);
      group.add(light);
      lamps.push(light);
    }
  }

  const positions = new Float32Array(480 * 3);
  const velocities = [];
  for (let i = 0; i < 480; i++) {
    positions.set(
      [(rand() - 0.5) * 84, rand() * 18, (rand() - 0.5) * 84],
      i * 3,
    );
    velocities.push(0.7 + rand() * 0.9);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const snowflakes = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: "#ffffff",
      size: 0.13,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  snowflakes.name = "falling-snow";
  snowflakes.frustumCulled = false;
  group.add(snowflakes);
  const smoke = chimneyTops.flatMap((top) =>
    Array.from({ length: 4 }, (_, i) => {
      const puff = ball(
        0.18,
        new THREE.MeshBasicMaterial({
          color: "#dae2e7",
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        }),
        top.x,
        top.y + i * 0.65,
        top.z,
      );
      puff.castShadow = false;
      return { puff, top, offset: i * 0.9 };
    }),
  );
  let elapsed = 0;
  return {
    group,
    blockers,
    entranceGate,
    returnGate,
    pond,
    skateSpot,
    cocoaSpot,
    snowman,
    snowflakes,
    visibility,
    contains: (x, z) =>
      Math.hypot(x, z) < 40 &&
      Math.pow((x - 17) / 7.2, 2) + Math.pow((z + 4) / 9.2, 2) >= 1,
    heightAt: () => 0,
    nearby(position) {
      if (position.distanceTo(snowman.position) < 3.8) return "snowman";
      if (position.distanceTo(skateSpot) < 3.2) return "skate";
      if (position.distanceTo(cocoaSpot) < 3.4) return "cocoa";
      return null;
    },
    get snowmanStage() {
      return snowmanStage;
    },
    buildSnowman() {
      snowmanStage = Math.min(3, snowmanStage + 1);
      syncSnowman();
    },
    previewSnowman: syncSnowman,
    resetSnowman() {
      snowmanStage = 0;
      syncSnowman();
    },
    animate(dt) {
      elapsed += dt;
      for (let i = 0; i < velocities.length; i++) {
        positions[i * 3 + 1] -= dt * velocities[i];
        positions[i * 3] += Math.sin(elapsed * 0.4 + i) * dt * 0.15;
        if (positions[i * 3 + 1] < 0.1) positions[i * 3 + 1] += 18;
      }
      geometry.attributes.position.needsUpdate = true;
      smoke.forEach(({ puff, top, offset }) => {
        const age = (elapsed * 0.45 + offset) % 3.6;
        puff.position.set(
          top.x + age * 0.3,
          top.y + age,
          top.z + Math.sin(age) * 0.12,
        );
        puff.scale.setScalar(1 + age * 1.6);
        puff.material.opacity = 0.22 * (1 - age / 3.6);
      });
    },
  };
}
