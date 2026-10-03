import * as THREE from "./vendor/three.module.js";
import { createTreeVisibility } from "./tree-visibility.js?v=20261002-camera-clear";

export function createRiverside({ mesh, box, cyl, ball }) {
  const group = new THREE.Group();
  group.visible = false;
  const sceneryVisibility = createTreeVisibility({
    cameraClearance: 10,
    obstructedOpacity: 0,
  });
  const blockers = [];
  const entrance = new THREE.Group();
  entrance.position.set(-32, 0, 0);
  entrance.rotation.y = Math.PI / 2;
  function gate(parent) {
    for (const side of [-1, 1]) {
      box(0.4, 3.6, 0.45, "#ded6ad", side * 2, 1.8, 0, parent);
      cyl(0.3, 0.3, 0.2, "#ecdfbf", side * 2, 3.65, 0, parent);
      for (let i = 0; i < 7; i++) {
        const leaf = ball(
          0.26,
          "#598657",
          side * (2 + Math.sin(i) * 0.13),
          0.6 + i * 0.43,
          0.27,
          parent,
        );
        leaf.scale.y = 1.3;
        if (i % 2 === 0)
          ball(0.13, "#e9adce", side * 1.8, 0.7 + i * 0.43, 0.4, parent);
      }
    }
    box(4.5, 0.38, 0.6, "#ded6ad", 0, 3.6, 0, parent);
    for (let i = 0; i < 9; i++)
      ball(
        0.25,
        i % 3 ? "#598657" : "#f3b9d5",
        -2 + i * 0.5,
        3.85,
        0.1,
        parent,
      );
    const emblem = mesh(
      new THREE.OctahedronGeometry(0.3),
      "#63ded8",
      0,
      3.6,
      0.42,
      parent,
    );
    emblem.rotation.z = Math.PI / 4;
  }
  gate(entrance);
  const returnGate = new THREE.Group();
  returnGate.name = "riverside-return-gate";
  returnGate.position.set(9, 0, 40);
  group.add(returnGate);
  gate(returnGate);
  const center = (z) => Math.sin(z * 0.12) * 3;
  const inWater = (x, z, margin = 0) => Math.abs(x - center(z)) < 3.1 + margin;
  const onBridge = (x, z) => Math.abs(z) < 1.25 && Math.abs(x) < 6;
  const islandX = 48,
    islandZ = 56;
  const onIsland = (x, z, margin = 0) =>
    Math.hypot(x / (islandX - margin), z / (islandZ - margin)) < 1;
  const edgeZ = (x) => islandZ * Math.sqrt(Math.max(0, 1 - (x / islandX) ** 2));
  const contains = (x, z) =>
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    onIsland(x, z, 0.65) &&
    (!inWater(x, z, 0.5) || onBridge(x, z));
  const ground = cyl(1, 1, 3.6, "#79a56e", 0, -1.82, 0, group, 128);
  ground.name = "riverside-island";
  ground.scale.set(islandX, 1, islandZ);
  for (let i = 0; i < 44; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (38 + (i % 4) * 2.4);
    const z = -34 + Math.floor(i / 2) * 3.3;
    if (!onIsland(x, z, 3)) continue;
    const tree = new THREE.Group();
    tree.name = "riverside-tree";
    group.add(tree);
    cyl(0.16, 0.28, 2.8, "#756044", x, 1.4, z, tree);
    const crown = ball(
      1.8 + (i % 3) * 0.3,
      i % 3 ? "#55865d" : "#709b65",
      x,
      3.3,
      z,
      tree,
    );
    crown.scale.y = 1.25;
    sceneryVisibility.add(tree);
    blockers.push({ x, z, r: 0.45 });
  }
  // Each bank and water edge follows the island rim rather than ending inland.
  function ribbon(width, color, y) {
    const vertices = [],
      indices = [];
    for (let i = 0; i <= 224; i++) {
      const z = -islandZ + i * 0.5;
      for (const side of [-1, 1]) {
        const x = center(z) + side * width;
        const clippedZ = Math.sign(z) * Math.min(Math.abs(z), edgeZ(x));
        vertices.push(x, y, clippedZ);
      }
      if (i < 224) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.28,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const surface = mesh(geo, material, 0, 0, 0, group);
    surface.name = width === 3.1 ? "island-river" : "island-bank";
    surface.castShadow = false;
    return surface;
  }
  ribbon(6.9, "#cfc39b", 0.008);
  ribbon(4.2, "#ddcda3", 0.015);
  ribbon(3.1, "#52bbca", 0.04);
  const waterfallStreaks = [];
  const mist = [];
  for (const side of [-1]) {
    const drop = 12;
    const vertices = [],
      indices = [];
    for (let i = 0; i <= 32; i++) {
      const x = center(side * islandZ) - 3.1 + (i / 32) * 6.2;
      const z = side * edgeZ(x);
      vertices.push(
        x,
        0.04,
        z,
        x + (i / 32 - 0.5) * (side > 0 ? 4 : 1),
        -drop,
        z + side * 2,
      );
      if (i < 32) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const waterfall = mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: "#79d4d8",
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        roughness: 0.3,
      }),
      0,
      0,
      0,
      group,
    );
    waterfall.name = "edge-waterfall";
    waterfall.castShadow = false;
    for (let i = 0; i < 18; i++) {
      const x = center(side * islandZ) - 2.9 + i * (5.8 / 17);
      const streak = box(
        0.035 + (i % 3) * 0.02,
        0.6 + (i % 4) * 0.15,
        0.02,
        "#c4f3e9",
        x,
        0,
        side * edgeZ(x),
        group,
      );
      streak.castShadow = false;
      waterfallStreaks.push({
        mesh: streak,
        side,
        z: side * edgeZ(x),
        phase: i / 18,
        drop,
      });
    }
    // A thin foam lip makes the transition from river to falling water readable.
    for (let i = 0; i < 20; i++) {
      const x = center(side * islandZ) - 3 + i * (6 / 19);
      const foam = ball(0.15, "#dcf6e8", x, 0.08, side * edgeZ(x), group);
      foam.scale.set(1.25, 0.3, 0.7);
      foam.castShadow = false;
    }
  }
  // The upstream end is fed by a mountain waterfall; only the downstream
  // end leaves the island. Keep this scenery beyond the walkable banks.
  const sourceX = center(islandZ);
  const mountain = new THREE.Group();
  mountain.name = "waterfall-mountain";
  group.add(mountain);
  const mountainSurfaces = [];
  function peak(x, z, radius, height, color) {
    const rock = mesh(
      new THREE.ConeGeometry(radius, height, 64),
      color,
      x,
      height / 2 - 0.04,
      z,
      mountain,
    );
    rock.scale.z = 0.85;
    mountainSurfaces.push(rock);
    return rock;
  }
  peak(sourceX - 25, 108, 25, 39, "#718b7c");
  peak(sourceX + 26, 113, 27, 44, "#637f73");
  peak(sourceX, 104, 36, 58, "#7d9581");
  const snow = mesh(
    new THREE.ConeGeometry(6.5, 10.5, 32),
    "#e1eee3",
    sourceX,
    52.71,
    104,
    mountain,
  );
  snow.scale.z = 0.85;
  // A broad rock face supports the crest, with broken shoulders framing it.
  const cliff = mesh(
    new THREE.CylinderGeometry(9, 12, 32, 9),
    "#7a9188",
    sourceX,
    16,
    80,
    mountain,
  );
  cliff.scale.z = 0.65;
  mountainSurfaces.push(cliff);
  for (const side of [-1, 1]) {
    const shoulder = ball(8, "#6e897a", sourceX + side * 10, 14, 81, mountain);
    shoulder.scale.set(0.7, 2, 1);
    mountainSurfaces.push(shoulder);
  }
  // Sample the actual topmost rock surface so plants cover every peak without
  // floating over slopes or disappearing inside overlapping mountains.
  mountain.updateWorldMatrix(true, true);
  const surfaceRay = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const surfaceHits = [];
  let forestSeed = 8621;
  const forestRandom = () =>
    (forestSeed = (Math.imul(forestSeed, 1664525) + 1013904223) >>> 0) /
    4294967296;
  const peakSites = [
    { x: sourceX - 25, z: 108, r: 25 },
    { x: sourceX + 26, z: 113, r: 27 },
    { x: sourceX, z: 104, r: 36 },
  ];
  function plantSite(index) {
    const peak = peakSites[index % peakSites.length];
    for (let attempt = 0; attempt < 100; attempt++) {
      const angle = forestRandom() * Math.PI * 2;
      const radius = Math.sqrt(forestRandom()) * peak.r * 0.98;
      const x = peak.x + Math.cos(angle) * radius;
      const z = peak.z + Math.sin(angle) * radius * 0.85;
      // Leave the waterfall and its source visible, and keep snow above the tree line.
      if (Math.abs(x - sourceX) < 4.8 && z < 88) continue;
      surfaceRay.set(new THREE.Vector3(x, 100, z), down);
      surfaceHits.length = 0;
      surfaceRay.intersectObjects(mountainSurfaces, false, surfaceHits);
      const hit = surfaceHits[0];
      if (!hit || hit.point.y > 47.3) continue;
      return {
        x,
        y: hit.point.y - 0.05,
        z,
        normal: hit.face.normal
          .clone()
          .applyNormalMatrix(
            new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld),
          ),
      };
    }
    throw new Error("Could not find a mountain planting surface");
  }
  const forest = new THREE.Group();
  forest.name = "mountain-forest";
  mountain.add(forest);
  const treeTransform = new THREE.Object3D();
  const color = new THREE.Color();
  function plantBatch(parent, name, geometry, baseColor, count) {
    const batch = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.95,
        flatShading: true,
      }),
      count,
    );
    batch.name = name;
    batch.castShadow = true;
    batch.receiveShadow = true;
    parent.add(batch);
    return batch;
  }
  function plantInstance(batch, index, x, y, z, sx, sy, sz, yaw, tint) {
    treeTransform.position.set(x, y, z);
    treeTransform.rotation.set(0, yaw, 0);
    treeTransform.scale.set(sx, sy, sz);
    treeTransform.updateMatrix();
    batch.setMatrixAt(index, treeTransform.matrix);
    if (tint) {
      color.set(tint).multiplyScalar(0.84 + forestRandom() * 0.3);
      batch.setColorAt(index, color);
    }
  }
  const varieties = [
    { name: "spruce", trunk: "#6a5940", leaf: "#35684d", shape: "cone" },
    { name: "pine", trunk: "#78654b", leaf: "#537b42", shape: "umbrella" },
    { name: "oak", trunk: "#71513b", leaf: "#698e43", shape: "round" },
    { name: "birch", trunk: "#e2ddbd", leaf: "#8eaa56", shape: "tall" },
  ];
  const perVariety = 450;
  forest.userData.treeCount = perVariety * varieties.length;
  forest.userData.varieties = varieties.map((v) => v.name);
  varieties.forEach((variety, species) => {
    const trunks = plantBatch(
      forest,
      variety.name + "-trunks",
      new THREE.CylinderGeometry(0.13, 0.22, 1, 6),
      variety.trunk,
      perVariety,
    );
    const canopies = plantBatch(
      forest,
      variety.name + "-canopies",
      variety.shape === "cone"
        ? new THREE.ConeGeometry(1, 1, 7)
        : new THREE.IcosahedronGeometry(1, 1),
      "#ffffff",
      perVariety * 3,
    );
    for (let i = 0; i < perVariety; i++) {
      const site = plantSite(i + species);
      const size = (0.55 + forestRandom() * 0.7) * (site.y > 35 ? 0.8 : 1);
      const yaw = forestRandom() * Math.PI * 2;
      const trunkHeight = size * (variety.shape === "umbrella" ? 4.2 : 2.8);
      plantInstance(
        trunks,
        i,
        site.x,
        site.y + trunkHeight / 2,
        site.z,
        size,
        trunkHeight,
        size,
        yaw,
      );
      for (let tier = 0; tier < 3; tier++) {
        let x = site.x,
          z = site.z,
          y,
          sx,
          sy,
          sz;
        if (variety.shape === "cone") {
          y = site.y + size * (2.4 + tier * 1.05);
          sx = sz = size * (1.45 - tier * 0.3);
          sy = size * 2.6;
        } else if (variety.shape === "umbrella") {
          x += Math.cos(yaw + tier * 2.1) * size * 0.65;
          z += Math.sin(yaw + tier * 2.1) * size * 0.65;
          y = site.y + size * (4.1 + tier * 0.18);
          sx = size * 1.6;
          sy = size * 0.7;
          sz = size * 1.3;
        } else if (variety.shape === "round") {
          x += Math.cos(yaw + tier * 2.1) * size * 0.55;
          z += Math.sin(yaw + tier * 2.1) * size * 0.55;
          y = site.y + size * (2.9 + tier * 0.4);
          sx = size * 1.35;
          sy = size * 1.4;
          sz = size * 1.25;
        } else {
          x += Math.cos(yaw + tier * 2.1) * size * 0.25;
          z += Math.sin(yaw + tier * 2.1) * size * 0.25;
          y = site.y + size * (2.7 + tier * 0.85);
          sx = size * 0.85;
          sy = size * 1.5;
          sz = size * 0.8;
        }
        plantInstance(
          canopies,
          i * 3 + tier,
          x,
          y,
          z,
          sx,
          sy,
          sz,
          yaw,
          variety.leaf,
        );
      }
    }
  });
  const grass = new THREE.Group();
  grass.name = "mountain-grass";
  mountain.add(grass);
  const grassCount = 9000;
  grass.userData.tuftCount = grassCount;
  const blades = plantBatch(
    grass,
    "mountain-grass-blades",
    new THREE.ConeGeometry(1, 1, 3),
    "#ffffff",
    grassCount * 3,
  );
  blades.castShadow = false;
  const grassColors = ["#79974b", "#91ac5e", "#a6b86b", "#618b4b"];
  for (let i = 0; i < grassCount; i++) {
    const site = plantSite(i);
    const height = 0.25 + forestRandom() * 0.5;
    const yaw = forestRandom() * Math.PI * 2;
    for (let blade = 0; blade < 3; blade++) {
      const offset = (blade - 1) * 0.13;
      plantInstance(
        blades,
        i * 3 + blade,
        site.x + Math.cos(yaw) * offset,
        site.y +
          height / 2 -
          ((site.normal.x * Math.cos(yaw) + site.normal.z * Math.sin(yaw)) *
            offset) /
            site.normal.y,
        site.z + Math.sin(yaw) * offset,
        0.09 + forestRandom() * 0.05,
        height,
        0.09,
        yaw + blade * 0.6,
        grassColors[i % grassColors.length],
      );
    }
  }
  const crestZ = 73.9,
    crestY = 32.15;
  const sourceMaterial = new THREE.MeshStandardMaterial({
    color: "#75d6df",
    roughness: 0.24,
    metalness: 0.12,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const fallVertices = [],
    fallIndices = [];
  for (let i = 0; i <= 32; i++) {
    const x = sourceX - 3.1 + (i * 6.2) / 32;
    fallVertices.push(x, crestY, crestZ, x, 0.04, 71.8);
    if (i < 32) {
      const a = i * 2;
      fallIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const fallGeometry = new THREE.BufferGeometry();
  fallGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(fallVertices, 3),
  );
  fallGeometry.setIndex(fallIndices);
  fallGeometry.computeVertexNormals();
  const sourceFall = mesh(fallGeometry, sourceMaterial, 0, 0, 0, group);
  sourceFall.name = "mountain-waterfall";
  sourceFall.castShadow = false;
  const sourceStream = box(
    6.2,
    0.08,
    11.9,
    "#75d6df",
    sourceX,
    crestY,
    79.85,
    mountain,
  );
  sourceStream.name = "waterfall-source-stream";
  // A solid, non-walkable upstream terrace joins the mountain to the island.
  const terraceVertices = [],
    terraceIndices = [];
  for (let i = 0; i <= 32; i++) {
    const x = sourceX - 9 + (i * 18) / 32;
    const front = edgeZ(x);
    terraceVertices.push(
      x,
      -0.04,
      front,
      x,
      -0.04,
      73,
      x,
      -3.64,
      front,
      x,
      -3.64,
      73,
    );
    if (i < 32) {
      const a = i * 4;
      terraceIndices.push(
        a,
        a + 1,
        a + 4,
        a + 1,
        a + 5,
        a + 4,
        a,
        a + 4,
        a + 2,
        a + 2,
        a + 4,
        a + 6,
        a + 1,
        a + 3,
        a + 5,
        a + 3,
        a + 7,
        a + 5,
      );
    }
  }
  terraceIndices.push(0, 2, 1, 1, 2, 3, 128, 129, 130, 129, 131, 130);
  const terraceGeometry = new THREE.BufferGeometry();
  terraceGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(terraceVertices, 3),
  );
  terraceGeometry.setIndex(terraceIndices);
  terraceGeometry.computeVertexNormals();
  mesh(terraceGeometry, "#79a56e", 0, 0, 0, group).name =
    "waterfall-source-terrace";
  // Connect the water and both banks to their exact upstream river vertices.
  function sourceFeed(width, y, material, name) {
    const vertices = [
      sourceX - width,
      y,
      edgeZ(sourceX - width),
      sourceX + width,
      y,
      edgeZ(sourceX + width),
      sourceX - width,
      y,
      71.8,
      sourceX + width,
      y,
      71.8,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex([0, 2, 1, 1, 2, 3]);
    geometry.computeVertexNormals();
    const feed = mesh(geometry, material, 0, 0, 0, group);
    feed.name = name;
    feed.castShadow = false;
  }
  sourceFeed(6.9, 0.008, "#cfc39b", "waterfall-source-bank");
  sourceFeed(4.2, 0.015, "#ddcda3", "waterfall-source-bank");
  sourceFeed(3.1, 0.04, sourceMaterial, "waterfall-river-feed");
  const sourceStreaks = [];
  for (let i = 0; i < 28; i++) {
    const streak = box(
      0.05 + (i % 3) * 0.025,
      1.1 + (i % 4) * 0.45,
      0.035,
      "#d0f6f0",
      sourceX - 2.95 + (i * 5.9) / 27,
      0,
      crestZ - 0.06,
      group,
    );
    streak.castShadow = false;
    sourceStreaks.push(streak);
  }
  for (let i = 0; i < 24; i++) {
    const foam = ball(
      0.25,
      "#e0f8ef",
      sourceX - 3.2 + (i * 6.4) / 23,
      0.12 + (i % 3) * 0.08,
      71.55 - (i % 4) * 0.3,
      group,
    );
    foam.scale.set(1.5, 0.45, 1.1);
    foam.castShadow = false;
  }
  const rainbow = new THREE.Group();
  rainbow.name = "waterfall-rainbow";
  rainbow.position.set(sourceX, 0.8, 65);
  group.add(rainbow);
  [
    "#ff727a",
    "#ffaf65",
    "#ffe789",
    "#8ae6a0",
    "#70dce7",
    "#839ee9",
    "#c39bef",
  ].forEach((color, i) => {
    const arc = mesh(
      new THREE.TorusGeometry(10.8 - i * 0.28, 0.17, 6, 96, Math.PI),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      }),
      0,
      0,
      0,
      rainbow,
    );
    arc.castShadow = false;
    arc.receiveShadow = false;
  });
  for (let i = 0; i < 24; i++) {
    const cloud = mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: "#e8faf0",
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
      0,
      0,
      0,
      group,
    );
    cloud.castShadow = false;
    cloud.scale.set(1.8 + (i % 3), 0.5, 0.8);
    mist.push(cloud);
  }
  const landmarks = [];
  function landmark(name, x, z) {
    const place = new THREE.Group();
    place.name = name;
    place.position.set(x, 0, z);
    group.add(place);
    landmarks.push({ name, group: place, x, z });
    return place;
  }
  const picnic = landmark("Wildflower picnic", -12, -25);
  for (let x = 0; x < 6; x++)
    for (let z = 0; z < 5; z++) {
      box(
        0.5,
        0.025,
        0.5,
        (x + z) % 2 ? "#f5dfbe" : "#db8e9f",
        -1.25 + x * 0.5,
        0.025,
        -1 + z * 0.5,
        picnic,
      );
    }
  box(0.6, 0.35, 0.45, "#b88851", -0.8, 0.22, -0.65, picnic);
  const handle = mesh(
    new THREE.TorusGeometry(0.22, 0.04, 5, 16, Math.PI),
    "#966c40",
    -0.8,
    0.42,
    -0.65,
    picnic,
  );
  handle.rotation.y = Math.PI / 2;
  cyl(0.3, 0.3, 0.04, "#fff1d0", 0.55, 0.055, 0.2, picnic, 16);
  for (let i = 0; i < 3; i++)
    ball(
      0.12,
      ["#dc666f", "#e8bd55", "#90b65d"][i],
      0.45 + i * 0.15,
      0.18,
      0.2,
      picnic,
    );
  for (const x of [-1.2, 1.2]) {
    const cushion = ball(0.4, "#e9b779", x, 0.15, 0.9, picnic);
    cushion.scale.y = 0.35;
  }
  const boat = landmark("The little fishing boat", 10, -12);
  boat.rotation.y = -0.4;
  const hull = mesh(
    new THREE.SphereGeometry(
      1,
      12,
      6,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    "#ac7b50",
    0,
    0.65,
    0,
    boat,
  );
  hull.scale.set(0.95, 0.65, 2.2);
  box(0.12, 0.14, 3.4, "#e5bf82", -0.9, 0.65, 0, boat);
  box(0.12, 0.14, 3.4, "#e5bf82", 0.9, 0.65, 0, boat);
  for (const z of [-0.8, 0.8])
    box(1.65, 0.12, 0.35, "#cea16b", 0, 0.48, z, boat);
  const oar = box(0.08, 0.08, 3.5, "#7c6241", 0.1, 0.8, 0, boat);
  oar.rotation.y = 0.6;
  box(0.3, 0.08, 0.7, "#7c6241", 1, 0.8, 1.2, boat);
  blockers.push({ x: 10, z: -12, r: 1.8 });
  const gazebo = landmark("The flower gazebo", 16, 26);
  for (const x of [-2, 2])
    for (const z of [-2, 2]) {
      cyl(0.09, 0.12, 2.7, "#e6d8b8", x, 1.35, z, gazebo);
      blockers.push({ x: 16 + x, z: 26 + z, r: 0.18 });
      for (let i = 0; i < 5; i++) {
        ball(0.16, "#73a16a", x, 0.6 + i * 0.4, z, gazebo);
        if (i % 2 === 0)
          ball(0.1, "#ecafd1", x + 0.13, 0.65 + i * 0.4, z, gazebo);
      }
    }
  const roof = mesh(
    new THREE.ConeGeometry(3.25, 1.1, 4),
    "#b8c99a",
    0,
    3.25,
    0,
    gazebo,
  );
  roof.rotation.y = Math.PI / 4;
  for (const x of [-1.5, 1.5]) {
    box(0.6, 0.1, 2.6, "#c69e71", x, 0.6, 0, gazebo);
    for (const z of [-1, 1]) box(0.1, 0.6, 0.1, "#927453", x, 0.3, z, gazebo);
    // Cover the entire seat, including its corners and both ends.
    for (const z of [-0.975, -0.325, 0.325, 0.975])
      blockers.push({ x: 16 + x, z: 26 + z, r: 0.45 });
  }
  sceneryVisibility.add(gazebo);
  const lookout = landmark("Rainbow waterfall lookout", 9, 49);
  const deck = cyl(2, 2, 0.16, "#c9a474", 0, 0.07, 0, lookout, 12);
  for (let i = 0; i < 5; i++)
    box(3.4, 0.025, 0.035, "#956f4c", 0, 0.165, -1.2 + i * 0.6, lookout);
  for (let i = 0; i < 5; i++) {
    const a = (i / 4) * Math.PI;
    const x = Math.cos(a) * 1.9,
      z = Math.sin(a) * 1.9;
    cyl(0.07, 0.07, 0.9, "#e0c597", x, 0.6, z, lookout);
    blockers.push({ x: 9 + x, z: 49 + z, r: 0.12 });
  }
  for (let i = 0; i < 24; i++)
    box(
      0.42,
      0.14,
      2.5,
      i % 2 ? "#be9466" : "#cfa476",
      -5.5 + i * 0.48,
      0.14,
      0,
      group,
    );
  for (const z of [-1.35, 1.35]) {
    box(11.8, 0.12, 0.12, "#8b6848", 0, 1, z, group);
    for (const x of [-5.5, -3, 0, 3, 5.5])
      box(0.14, 1.15, 0.14, "#8b6848", x, 0.6, z, group);
  }
  function duck(parent, i) {
    const bird = new THREE.Group();
    parent.add(bird);
    const body = ball(
      i < 2 ? 0.25 : 0.4,
      i < 2 ? "#f7d572" : "#fff3d2",
      0,
      0.25,
      0,
      bird,
    );
    body.scale.set(0.75, 0.7, 1.3);
    ball(0.22, i % 2 ? "#397b63" : "#fff3d2", 0, 0.55, 0.28, bird);
    box(0.2, 0.09, 0.23, "#eda847", 0, 0.49, 0.51, bird);
    for (const side of [-1, 1])
      ball(0.035, "#293839", side * 0.17, 0.59, 0.36, bird);
    const wing = ball(0.22, "#d6cdb3", 0.26, 0.28, -0.03, bird);
    wing.scale.set(0.3, 0.65, 1.3);
    return bird;
  }
  const ducks = Array.from({ length: 7 }, (_, i) => duck(group, i));
  const ripples = [];
  for (let i = 0; i < 52; i++) {
    const ripple = box(
      0.65 + (i % 3) * 0.12,
      0.012,
      0.035,
      "#b5ebe4",
      0,
      0.065,
      0,
      group,
    );
    ripple.castShadow = false;
    ripples.push(ripple);
  }
  // Scatter small flowers across the rest of the finite island.
  let meadowSeed = 9187;
  const random = () =>
    (meadowSeed = (Math.imul(meadowSeed, 1664525) + 1013904223) >>> 0) /
    4294967296;
  for (let i = 0; i < 220; i++) {
    const x = (random() - 0.5) * islandX * 2;
    const z = (random() - 0.5) * islandZ * 2;
    if (
      !onIsland(x, z, 2) ||
      Math.abs(x - center(z)) < 8 ||
      (Math.abs(x) < 22 && Math.abs(z) < 23)
    )
      continue;
    cyl(0.025, 0.045, 0.65, "#4e824d", x, 0.325, z, group);
    ball(0.14, ["#f5d47c", "#e6a6c7", "#b6bbef"][i % 3], x, 0.7, z, group);
  }
  // Low flowers and reeds keep the banks open to the camera.
  for (let i = 0; i < 90; i++) {
    const z = -22 + ((i * 7.13) % 44),
      side = i % 2 ? 1 : -1;
    const x = center(z) + side * (8 + ((i * 1.7) % 11));
    cyl(0.025, 0.045, 0.65, "#4e824d", x, 0.325, z, group);
    ball(0.14, ["#f5d47c", "#e6a6c7", "#b6bbef"][i % 3], x, 0.7, z, group);
    if (i % 5 === 0) {
      const shrub = ball(0.85, "#4e885f", x + side, 0.45, z, group);
      shrub.scale.y = 0.7;
    }
  }
  const types = [
    ["Ruby", "#ed6884", true],
    ["Sapphire", "#648eef", true],
    ["Emerald", "#55d2a0", true],
    ["Amethyst", "#b58aea", true],
    ["Rose quartz", "#f5afc8", false],
    ["Amber", "#edb954", false],
  ];
  const treasures = [];
  const clusterSites = [
    [-15.5, -23],
    [12.5, -8.5],
    [-12, 10],
    [12, 27],
    [-9, 39],
    [7, 47],
  ];
  const clusters = [];
  for (const [cx, cz] of clusterSites) {
    const cover = new THREE.Group();
    cover.name = "hidden-gem-cluster";
    group.add(cover);
    clusters.push({ x: cx, z: cz });
    for (let i = 0; i < 7; i++) {
      const angle = (i * Math.PI * 2) / 7;
      const x = cx + Math.cos(angle) * 1.1,
        z = cz + Math.sin(angle) * 1.1;
      cyl(0.025, 0.035, 0.85 + (i % 3) * 0.12, "#658d57", x, 0.45, z, cover);
      const leaf = ball(0.22, "#88ab67", x, 0.6, z, cover);
      leaf.scale.set(0.35, 1.8, 0.65);
      if (i % 2 === 0) ball(0.09, "#f2d78c", x, 0.98, z, cover);
    }
    for (const side of [-1, 1]) {
      const stone = ball(
        0.42,
        "#97a89a",
        cx + side * 1.2,
        0.18,
        cz - 0.7,
        cover,
      );
      stone.scale.y = 0.45;
    }
  }
  for (let i = 0; i < 18; i++) {
    const [name, color, gem] = types[i % types.length];
    const [cx, cz] = clusterSites[Math.floor(i / 3)];
    const angle = ((i % 3) * Math.PI * 2) / 3;
    const x = cx + Math.cos(angle) * 0.55;
    const z = cz + Math.sin(angle) * 0.55;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: gem ? 0.2 : 0.5,
      metalness: 0.2,
      emissive: color,
      emissiveIntensity: 0.18,
      flatShading: true,
    });
    const crystal = mesh(
      gem
        ? new THREE.OctahedronGeometry(0.36)
        : new THREE.IcosahedronGeometry(0.36, 1),
      material,
      x,
      0.45,
      z,
      group,
    );
    if (!gem) crystal.scale.set(1.3, 0.65, 0.9);
    const glow = mesh(
      new THREE.TorusGeometry(0.48, 0.018, 4, 24),
      color,
      x,
      0.08,
      z,
      group,
    );
    glow.rotation.x = -Math.PI / 2;
    treasures.push({ crystal, glow, name, color, got: false });
  }
  return {
    group,
    entrance,
    treasures,
    landmarks,
    clusters,
    locationAt(p) {
      return (
        landmarks.find((l) => Math.hypot(p.x - l.x, p.z - l.z) < 6)?.name ||
        "Rainbow Riverside"
      );
    },
    blockers,
    returnGate,
    arrival: new THREE.Vector3(9, 0, 44),

    updateVisibility: sceneryVisibility.update,
    contains,
    heightAt: (x, z) =>
      onBridge(x, z) ? 0.22 : Math.hypot(x - 9, z - 49) < 1.95 ? 0.16 : 0,
    isEntrance: (p) => Math.abs(p.z) < 1.5 && p.x < -31.1 && p.x > -34,
    isExit: (p) =>
      Math.abs(p.x - returnGate.position.x) < 1.5 &&
      Math.abs(p.z - returnGate.position.z) < 1.3,
    reset() {
      treasures.forEach((t) => {
        t.got = false;
        t.crystal.visible = t.glow.visible = true;
      });
    },
    update(time) {
      ripples.forEach((r, i) => {
        const z = 53 - ((i * 2.1 + time * 0.6) % 106);
        r.position.set(center(z) + Math.sin(i * 4) * 2, 0.065, z);
      });
      waterfallStreaks.forEach(({ mesh: streak, side, z, phase, drop }) => {
        const progress = (time * 0.35 + phase) % 1;
        streak.position.y = -0.5 - progress * (drop - 1.5);
        streak.position.z = z + side * (0.06 + progress * 2);
      });
      sourceStreaks.forEach((streak, i) => {
        const progress = (time * 0.28 + i / sourceStreaks.length) % 1;
        streak.position.y = 0.9 + (1 - progress) * (crestY - 2.5);
        streak.position.z =
          71.8 + (streak.position.y / crestY) * (crestZ - 71.8) - 0.06;
      });
      mist.forEach((cloud, i) => {
        cloud.position.set(
          center(islandZ) + Math.sin(time * 0.25 + i * 2.3) * 5,
          0.9 + (i % 5) * 0.55 + Math.sin(time * 0.6 + i) * 0.4,
          70.3 + Math.cos(time * 0.3 + i) * 1.5,
        );
        cloud.material.opacity = 0.08 + (Math.sin(time * 0.5 + i) + 1) * 0.03;
      });
      ducks.forEach((d, i) => {
        const z = (i < 4 ? -12 : 12) + Math.sin(time * 0.16 + i) * 5;
        const x = center(z) + Math.sin(time * 0.23 + i * 1.3) * 1.6;
        const nextZ =
          (i < 4 ? -12 : 12) + Math.sin((time + 0.05) * 0.16 + i) * 5;
        const nextX =
          center(nextZ) + Math.sin((time + 0.05) * 0.23 + i * 1.3) * 1.6;
        d.position.set(x, 0.04 + Math.sin(time * 2 + i) * 0.015, z);
        d.rotation.y = Math.atan2(nextX - x, nextZ - z);
      });
      treasures.forEach((t, i) => {
        t.crystal.rotation.y = time * 0.5 + i;
        t.glow.scale.setScalar(1 + Math.sin(time * 2 + i) * 0.12);
      });
    },
  };
}
