import * as THREE from "./vendor/three.module.js";

export function createCastleRoom({ mesh, box, cyl, ball }) {
  const group = new THREE.Group();
  group.name = "castle-great-room";
  group.visible = false;
  const blockers = [],
    walls = [],
    stars = [],
    flames = [],
    treasureBoxes = [];
  let collected = 0,
    opened = false,
    page = 0,
    teaUntil = 0,
    sleeping = false;
  const wood = "#a97858",
    cream = "#eddfcd",
    pink = "#c79aaa";
  function solid(w, h, d, color, x, y, z) {
    const object = box(w, h, d, color, x, y, z, group);
    addFurnitureBlockers(w, d, x, z);
    return object;
  }
  function addFurnitureBlockers(w, d, x, z) {
    // Keep the same collision margin for furniture and treasure boxes.
    const alongX = w >= d,
      length = alongX ? w : d,
      radius = (alongX ? d : w) / 2;
    const steps = Math.max(1, Math.ceil(length / 0.5));
    for (let i = 0; i <= steps; i++)
      blockers.push({
        x: x + (alongX ? (i / steps - 0.5) * length : 0),
        z: z + (alongX ? 0 : (i / steps - 0.5) * length),
        r: radius,
        minClearance: 0.8,
      });
  }
  box(24, 0.3, 28, cream, 0, -0.17, 0, group);
  for (let x = -11; x <= 11; x += 2)
    for (let z = -13; z <= 13; z += 2)
      box(
        1.95,
        0.015,
        1.95,
        (x + z) % 4 ? "#e5cbb1" : "#eed9c0",
        x,
        0,
        z,
        group,
      );
  // A cutaway room, like the cave: camera-facing walls disappear.
  function wall(x, z, w, d) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    group.add(g);
    box(w, 6.5, d, cream, 0, 3.25, 0, g);
    box(w + 0.05, 0.3, d + 0.05, pink, 0, 5.9, 0, g);
    walls.push(g);
  }
  wall(-12, 0, 0.5, 28);
  wall(12, 0, 0.5, 28);
  wall(0, -14, 24, 0.5);
  wall(-7.5, 14, 9, 0.5);
  wall(7.5, 14, 9, 0.5);
  for (const x of [-8, -4, 0, 4, 8]) {
    box(1.8, 3, 0.1, "#aacdd0", x, 3.8, -13.7, group);
    box(0.1, 3, 0.15, wood, x, 3.8, -13.6, group);
    box(1.8, 0.1, 0.15, wood, x, 3.8, -13.6, group);
  }
  box(5, 0.03, 7, "#c99eaf", 0, 0.04, 10, group);
  for (const x of [-2.8, 2.8]) {
    cyl(0.24, 0.3, 5, cream, x, 2.5, 12.7, group);
    ball(0.35, "#e6c579", x, 5.2, 12.7, group);
  }
  const arch = mesh(
    new THREE.TorusGeometry(2.8, 0.22, 8, 36, Math.PI),
    pink,
    0,
    4,
    12.7,
    group,
  );
  arch.name = "castle-room-exit";
  // Fireplace and a sofa with cushions.
  solid(4, 3.5, 1.2, "#c4a892", 0, 1.75, -11.9);
  box(2.6, 1.7, 0.1, "#68504d", 0, 1, -11.23, group);
  for (let i = 0; i < 3; i++)
    flames.push(
      mesh(
        new THREE.ConeGeometry(0.23, 0.75 + i * 0.15, 7),
        "#ffc482",
        (i - 1) * 0.5,
        0.5,
        -11.15,
        group,
      ),
    );
  const fireLight = new THREE.PointLight("#ffc48b", 30, 15);
  fireLight.position.set(0, 3, -10);
  group.add(fireLight);
  solid(4.8, 0.7, 1.8, pink, -6, 0.5, -7);
  box(4.8, 1.5, 0.4, pink, -6, 1.4, -7.8, group);
  for (const x of [-7.7, -4.3]) box(0.45, 1.1, 1.8, pink, x, 1, -7, group);
  for (const x of [-7, -5]) {
    const cushion = ball(0.6, "#b7cbbb", x, 1.3, -7.3, group);
    cushion.scale.set(1, 0.5, 0.65);
  }
  // Reading corner, shelves and an open illustrated book.
  for (const x of [-10, 10]) {
    solid(1.1, 4, 5, wood, x, 2, -7);
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 8; i++)
        box(
          0.5,
          0.65 + (i % 3) * 0.15,
          0.27,
          ["#9db7ae", "#c4a1b3", "#dfc586"][i % 3],
          x + (x < 0 ? 0.55 : -0.55),
          0.8 + row * 1.05,
          -9 + i * 0.5,
          group,
        ).rotation.y = Math.PI / 2;
  }
  solid(2.4, 1.25, 1.8, wood, -7, 0.625, 1);
  box(1.1, 0.1, 0.9, "#f7e8c8", -7, 1.31, 1, group).rotation.z = 0.1;
  box(0.08, 0.12, 0.9, pink, -7, 1.35, 1, group);
  // Tea table, four little chairs and cups that steam after interacting.
  solid(3.6, 1.3, 3, wood, 5, 0.65, 2);
  for (const [x, z] of [
    [5, -0.3],
    [5, 4.3],
    [2.5, 2],
    [7.5, 2],
  ]) {
    solid(1, 0.65, 1, "#aabfaa", x, 0.325, z);
    box(1, 1.2, 0.18, "#aabfaa", x, 1.1, z - 0.42, group);
  }
  const steam = [];
  for (const x of [4.2, 5.8]) {
    cyl(0.18, 0.14, 0.25, "#eee1c8", x, 1.46, 2, group);
    const puff = ball(0.18, "#f5ebda", x, 1.9, 2, group);
    puff.material.transparent = true;
    steam.push(puff);
  }
  const teapot = ball(0.35, "#9cbfbb", 5, 1.65, 2, group);
  teapot.scale.y = 0.8;
  cyl(0.15, 0.2, 0.08, cream, 5, 1.95, 2, group);
  // Piano with individually animated keys.
  solid(3.8, 1.6, 1.4, "#62716a", 7, 0.8, -6);
  box(3.9, 1.5, 0.35, "#62716a", 7, 2.1, -6.55, group);
  const pianoKeys = [];
  for (let i = 0; i < 16; i++) {
    pianoKeys.push(
      box(0.21, 0.12, 0.7, "#f4e8d0", 5.25 + i * 0.23, 1.6, -5.55, group),
    );
    if (i % 7 !== 2 && i % 7 !== 6)
      box(0.11, 0.16, 0.36, "#4d5552", 5.35 + i * 0.23, 1.72, -5.75, group);
  }
  solid(2.4, 0.6, 0.85, wood, 7, 0.3, -3.8);
  // A treasure chest opens after finding all six hidden stars.
  // Keep the sofa-to-fireplace aisle clear for both characters.
  const chestZ = -2;
  solid(2.4, 1.3, 1.5, wood, 0, 0.65, chestZ);
  const lid = new THREE.Group();
  lid.position.set(0, 1.3, chestZ - 0.75);
  group.add(lid);
  box(2.5, 0.2, 1.6, wood, 0, 0.1, 0.8, lid);
  for (const x of [-0.8, 0.8])
    box(0.15, 0.24, 1.65, "#e4c278", x, 0.1, 0.8, lid);
  const treasure = mesh(
    new THREE.IcosahedronGeometry(0.65, 1),
    "#ffe6a0",
    0,
    1.45,
    chestZ,
    group,
  );
  treasure.visible = false;
  // Open boxes along the room edges leave the central floor and sofa aisle clear.
  let seed = 4281;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  const gold = new THREE.MeshStandardMaterial({
    color: "#efc554",
    metalness: 0.7,
    roughness: 0.28,
    flatShading: true,
  });
  const coinGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.055, 12);
  for (const [x, z, kind] of [
    [-9, 4, "coins"],
    [-6, -12, "coins"],
    [5.5, -12, "gems"],
    [9, 5, "gems"],
  ]) {
    const crate = new THREE.Group();
    crate.name = kind === "coins" ? "castle-gold-box" : "castle-gem-box";
    crate.position.set(x, 0, z);
    group.add(crate);
    box(2.5, 0.16, 1.6, wood, 0, 0.12, 0, crate);
    for (const side of [-1, 1]) {
      box(0.16, 0.9, 1.6, wood, side * 1.17, 0.58, 0, crate);
      box(2.5, 0.9, 0.16, wood, 0, 0.58, side * 0.72, crate);
      box(0.13, 0.94, 1.64, "#ddbb7a", side * 0.82, 0.58, 0, crate);
    }
    addFurnitureBlockers(2.5, 1.6, x, z);
    if (kind === "coins") {
      box(2.12, 0.16, 1.23, "#c69a3d", 0, 0.87, 0, crate);
      const coins = new THREE.InstancedMesh(coinGeometry, gold, 100);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 100; i++) {
        const px = (random() - 0.5) * 1.95,
          pz = (random() - 0.5) * 1.02;
        dummy.position.set(
          px,
          0.98 + 0.24 * (1 - Math.abs(px) / 1.1) + random() * 0.1,
          pz,
        );
        dummy.rotation.set(
          (random() - 0.5) * 0.35,
          random() * 6,
          (random() - 0.5) * 0.35,
        );
        dummy.updateMatrix();
        coins.setMatrixAt(i, dummy.matrix);
      }
      coins.castShadow = coins.receiveShadow = true;
      crate.add(coins);
      for (const px of [-0.65, 0.6])
        for (let layer = 0; layer < 7; layer++) {
          const coin = new THREE.Mesh(coinGeometry, gold);
          coin.position.set(px, 1 + layer * 0.06, 0.23);
          coin.castShadow = true;
          crate.add(coin);
        }
    } else {
      box(2.12, 0.16, 1.23, "#899aae", 0, 0.87, 0, crate);
      const colors = ["#8dd8df", "#cc97db", "#8ad1a4", "#e69bbb", "#99b8e4"];
      for (let i = 0; i < 26; i++) {
        const gem = mesh(
          new THREE.OctahedronGeometry(0.16 + random() * 0.1),
          colors[i % colors.length],
          (random() - 0.5) * 1.9,
          1.04 + random() * 0.2,
          (random() - 0.5) * 0.98,
          crate,
        );
        gem.rotation.set(random() * 3, random() * 3, random() * 3);
      }
      for (let i = 0; i < 7; i++) {
        const crystal = new THREE.Group();
        crystal.position.set(
          ((i % 4) - 1.5) * 0.43,
          0.95,
          i < 4 ? -0.23 : 0.22,
        );
        crate.add(crystal);
        const height = 0.45 + random() * 0.7,
          color = colors[i % colors.length];
        cyl(0.13, 0.16, height, color, 0, height / 2, 0, crystal, 6);
        mesh(
          new THREE.ConeGeometry(0.13, 0.3, 6),
          color,
          0,
          height + 0.15,
          0,
          crystal,
        );
        crystal.rotation.z = (random() - 0.5) * 0.3;
      }
    }
    treasureBoxes.push({ group: crate, kind, x, z });
  }
  // A broad bed in the quiet southwest corner, away from the exit aisle.
  const bedGroup = new THREE.Group();
  bedGroup.name = "castle-bed";
  bedGroup.position.set(-6.5, 0, 9);
  group.add(bedGroup);
  box(4.4, 0.4, 4.2, wood, 0, 0.4, 0, bedGroup);
  for (const x of [-1.9, 1.9])
    for (const z of [-1.8, 1.8])
      box(0.2, 0.65, 0.2, wood, x, 0.325, z, bedGroup);
  box(4.3, 0.35, 4.05, "#f4e5d1", 0, 0.75, 0, bedGroup);
  box(4.5, 1.9, 0.22, pink, 0, 1.3, -2.05, bedGroup);
  box(4.5, 0.8, 0.2, pink, 0, 0.85, 2.05, bedGroup);
  const spread = new THREE.Group();
  bedGroup.add(spread);
  box(4.1, 0.16, 2.65, "#aac7ba", 0, 0.99, 0.52, spread);
  for (const x of [-1.95, 1.95])
    box(0.16, 0.18, 2.65, "#d2dfcc", x, 1, 0.52, spread);
  for (const x of [-1.03, 1.03]) {
    const pillow = ball(0.58, "#f8ead5", x, 1.03, -1.25, bedGroup);
    pillow.scale.set(1.2, 0.25, 0.75);
  }
  // A quilt drapes over both sleepers. The curved opening leaves their
  // joined hands and faces above the covers instead of clipping the cloth.
  const cover = new THREE.Group();
  cover.name = "sleeping-blanket";
  cover.visible = false;
  bedGroup.add(cover);
  const columns = 40,
    rows = 28,
    vertices = [],
    indices = [],
    cuffVertices = [],
    cuffIndices = [];
  const leadingEdge = (x) => -0.5 + 0.95 * Math.exp(-Math.pow(x / 0.5, 4));
  const heightAt = (x, t) =>
    1.11 +
    Math.exp(-Math.pow((Math.abs(x) - 0.8) / 0.72, 4)) *
      (1.55 * (1 - Math.pow(t, 6))) +
    0.015 * Math.sin(x * 8 + t * 7);
  for (let row = 0; row <= rows; row++)
    for (let column = 0; column <= columns; column++) {
      const x = -2.04 + (column / columns) * 4.08,
        t = row / rows;
      const edge = leadingEdge(x),
        z = edge + (2.02 - edge) * t;
      vertices.push(x, heightAt(x, t), z);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column,
          b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  const clothGeometry = new THREE.BufferGeometry();
  clothGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  clothGeometry.setIndex(indices);
  clothGeometry.computeVertexNormals();
  const quilt = mesh(
    clothGeometry,
    new THREE.MeshStandardMaterial({
      color: "#aac7ba",
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    0,
    0,
    0,
    cover,
  );
  quilt.name = "draped-quilt";
  for (let column = 0; column <= columns; column++) {
    const x = -2.04 + (column / columns) * 4.08,
      edge = leadingEdge(x);
    for (const offset of [0, 0.12]) {
      const t = offset / (2.02 - edge);
      cuffVertices.push(x, heightAt(x, t) + 0.022, edge + offset);
    }
    if (column < columns) {
      const a = column * 2;
      cuffIndices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  }
  const cuffGeometry = new THREE.BufferGeometry();
  cuffGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(cuffVertices, 3),
  );
  cuffGeometry.setIndex(cuffIndices);
  cuffGeometry.computeVertexNormals();
  mesh(cuffGeometry, "#dae5d4", 0, 0, 0, cover);
  // A warm bedside lamp keeps the faces and hands readable at night.
  cyl(0.035, 0.035, 0.6, "#b09b75", 2.15, 2.5, -2.05, bedGroup);
  const shade = mesh(
    new THREE.ConeGeometry(0.38, 0.45, 12, 1, true),
    "#e8d3aa",
    2.15,
    2.95,
    -2.05,
    bedGroup,
  );
  shade.material.side = THREE.DoubleSide;
  const bulb = mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshBasicMaterial({ color: "#ffe0b4" }),
    2.15,
    2.78,
    -2.05,
    bedGroup,
  );
  bulb.visible = false;
  const bedsideLight = new THREE.PointLight("#ffdfba", 0, 12);
  bedsideLight.position.set(2.15, 2.78, -2.05);
  bedGroup.add(bedsideLight);
  // Dense small circles follow the bed's rectangular footprint accurately.
  // A single large capsule would spill into the central walking aisle.
  for (let x = -2.2; x <= 2.2 + 0.001; x += 0.4)
    for (let z = -2.1; z <= 2.1 + 0.001; z += 0.4)
      blockers.push({
        x: bedGroup.position.x + x,
        z: bedGroup.position.z + z,
        r: 0.29,
        minClearance: 0.8,
      });
  const sleepSymbols = [];
  for (const x of [-1.03, 1.03]) {
    const symbol = new THREE.Group();
    symbol.position.set(x, 2.7, -1.25);
    symbol.visible = false;
    bedGroup.add(symbol);
    box(0.34, 0.055, 0.04, "#fff0cf", 0, 0.15, 0, symbol);
    box(0.34, 0.055, 0.04, "#fff0cf", 0, -0.15, 0, symbol);
    box(0.43, 0.055, 0.04, "#fff0cf", 0, 0, 0, symbol).rotation.z = Math.PI / 4;
    sleepSymbols.push(symbol);
  }
  const bed = {
    group: bedGroup,
    sleepSymbols,
    blanket: { spread, cover, quilt, leadingEdge },
    bedsideLight,
    wakePositions: [
      new THREE.Vector3(-2.65, 0, 8.2),
      new THREE.Vector3(-2.65, 0, 10),
    ],
  };
  const starPositions = [
    [-6.5, 5.5],
    [8, 8],
    [-8, -3],
    [3, -9],
    [8, -10],
    [0, 1],
  ];
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 0.22 : 0.5;
    const x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const starGeometry = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.12,
    bevelEnabled: false,
  });
  starPositions.forEach(([x, z], i) => {
    const g = mesh(starGeometry, "#ffe399", x, 1, z, group);
    g.name = `castle-star-${i + 1}`;
    stars.push({ g, x, z, got: false });
  });
  for (const [x, z] of [
    [-10, 10],
    [10, 10],
  ]) {
    cyl(0.45, 0.6, 0.8, pink, x, 0.4, z, group);
    for (let i = 0; i < 5; i++)
      ball(
        0.4,
        "#b5c49e",
        x + Math.sin(i) * 0.45,
        1.1 + (i % 2) * 0.4,
        z + Math.cos(i) * 0.45,
        group,
      );
    blockers.push({ x, z, r: 0.8, minClearance: 0.8 });
  }
  const activities = [
    { kind: "bed", x: -6.5, z: 9, radius: 5, label: "Lie down & rest · X" },
    { kind: "book", x: -7, z: 1, label: "Read the storybook · X" },
    { kind: "tea", x: 5, z: 2, label: "Share a cup of tea · X" },
    { kind: "piano", x: 7, z: -6, label: "Play the piano · X" },
    { kind: "chest", x: 0, z: chestZ, label: "Open the star chest · X" },
  ];
  let musicUntil = 0;
  function nearby(p) {
    return activities
      .filter((a) => Math.hypot(p.x - a.x, p.z - a.z) < (a.radius ?? 3.5))
      .sort(
        (a, b) =>
          Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z),
      )[0];
  }
  return {
    group,
    blockers,
    stars,
    activities,
    treasureBoxes,
    bed,
    rewardPosition: new THREE.Vector3(0, 2, chestZ),
    followDistance: 2.5,
    setSleeping(value) {
      sleeping = value;
      bed.blanket.cover.visible = value;
      bed.blanket.spread.visible = !value;
      bedsideLight.intensity = value ? 9 : 0;
      bulb.visible = value;
    },
    get collected() {
      return collected;
    },
    get opened() {
      return opened;
    },
    contains: (x, z) => Math.abs(x) < 10.9 && Math.abs(z) < 12.9,
    heightAt: () => 0,
    isExit: (p) => Math.abs(p.x) < 2 && p.z > 11.2,
    nearby,
    objective() {
      return opened
        ? "Star chest opened! Enjoy tea, music, stories and a cozy rest. Exit: the pink arch to the south."
        : `Find the six hidden stars to open the chest · ${collected} / 6. Bed, tea, piano and storybook: X nearby.`;
    },
    collect(p) {
      for (const star of stars)
        if (!star.got && Math.hypot(p.x - star.x, p.z - star.z) < 1.3) {
          star.got = true;
          star.g.visible = false;
          collected++;
          return star;
        }
      return null;
    },
    interact(p, time) {
      const a = nearby(p);
      if (!a) return null;
      if (a.kind === "bed")
        return { kind: "bed", message: "A cozy rest together · X to get up." };
      if (a.kind === "book")
        return {
          kind: "book",
          message: [
            "Once, a sunflower followed a little explorer all the way to a castle in the clouds.",
            "They filled their new home with music, warm tea, and stars gathered together.",
            "And every evening, they watched the rainbow from their mountain home. The end. ♥",
          ][page++ % 3],
        };
      if (a.kind === "tea") {
        teaUntil = time + 8;
        return {
          kind: "tea",
          message: "A warm cup for you, a warm cup for me. ♥",
        };
      }
      if (a.kind === "piano") {
        musicUntil = time + 3;
        return {
          kind: "piano",
          message: "A little melody fills the castle. ♪",
        };
      }
      if (collected < 6)
        return {
          kind: "locked",
          message: `The chest needs all six stars · ${collected} / 6 found.`,
        };
      if (opened)
        return {
          kind: "opened",
          message: "Your wishing star is safe in its little chest. ✦",
        };
      opened = true;
      treasure.visible = true;
      return {
        kind: "chest",
        message: "✦ A wishing star! Your castle treasure hunt is complete.",
      };
    },
    update(time, camera, dt) {
      walls.forEach(
        (w) =>
          (w.visible =
            w.position.x * camera.position.x +
              w.position.z * camera.position.z <
            100),
      );
      stars.forEach((s, i) => {
        s.g.rotation.y = time;
        s.g.position.y = 1 + Math.sin(time * 2 + i) * 0.15;
      });
      flames.forEach(
        (f, i) => (f.scale.y = 0.9 + Math.sin(time * 7 + i) * 0.12),
      );
      fireLight.intensity = sleeping
        ? 8 + Math.sin(time * 7) * 0.5
        : 30 + Math.sin(time * 7) * 2;
      steam.forEach((s, i) => {
        s.visible = time < teaUntil;
        s.position.y = 1.9 + ((time + i * 0.4) % 1) * 0.8;
        s.material.opacity = 0.5;
      });
      pianoKeys.forEach(
        (k, i) =>
          (k.position.y =
            time < musicUntil && Math.floor(time * 8) % 16 === i ? 1.54 : 1.6),
      );
      lid.rotation.x = THREE.MathUtils.lerp(
        lid.rotation.x,
        opened ? -1.1 : 0,
        1 - Math.exp(-dt * 6),
      );
      treasure.rotation.y = time * 0.8;
    },
    reset() {
      this.setSleeping(false);
      collected = 0;
      opened = false;
      page = 0;
      teaUntil = musicUntil = 0;
      stars.forEach((s) => {
        s.got = false;
        s.g.visible = true;
      });
      lid.rotation.x = 0;
      treasure.visible = false;
    },
  };
}
