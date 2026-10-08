import { createFestivalCrowd } from "./crowd.js";
import * as THREE from "three";

// A summer matsuri, reached through the funfair's north lantern gate.
export function createNightFestival({ mesh, box, cyl, ball }) {
  const group = new THREE.Group();
  group.name = "japanese-night-festival";
  group.visible = false;
  const blockers = [],
    ripples = [],
    fireflies = [];
  const warm = new THREE.MeshBasicMaterial({ color: "#ffd48a" });
  const pink = new THREE.MeshBasicMaterial({ color: "#ffad98" });
  const entrance = new THREE.Group();
  entrance.position.set(0, 0, -27);
  const returnGate = new THREE.Group();
  returnGate.position.set(0, 0, 27);
  group.add(returnGate);
  function gate(parent) {
    parent.name = "festival-lantern-gate";
    for (const s of [-1, 1]) {
      box(0.35, 4.8, 0.35, "#a94e40", s * 3, 2.4, 0, parent);
      lantern(s * 2.1, 3.8, 0, parent);
    }
    box(7.2, 0.3, 0.7, "#af5143", 0, 4.8, 0, parent);
    box(6.5, 0.22, 0.5, "#d79664", 0, 4.2, 0, parent);
  }
  function lantern(x, y, z, parent = group, light = false) {
    const paper = mesh(
      new THREE.SphereGeometry(0.38, 12, 10),
      warm,
      x,
      y,
      z,
      parent,
    );
    paper.scale.set(1, 1.3, 1);
    for (const dy of [-0.48, 0.48])
      cyl(0.22, 0.22, 0.09, "#6e4038", x, y + dy, z, parent);
    if (light) {
      const glow = new THREE.PointLight("#ffbd6c", 7, 10, 2);
      glow.position.set(x, y - 0.2, z);
      parent.add(glow);
    }
  }
  gate(entrance);
  gate(returnGate);
  // Separate banks leave an actual open channel; a full ground slab hid the water.
  box(66, 0.6, 33.3, "#405a56", 0, -0.4, 15.35, group).name =
    "festival-south-bank";
  box(66, 0.6, 21.3, "#405a56", 0, -0.4, -21.35, group).name =
    "festival-north-bank";
  box(64, 0.4, 9.4, "#173d50", 0, -0.95, -6, group).name = "festival-riverbed";
  // Broad pale paths remain legible under the blue night fill light.
  box(9, 0.08, 29.8, "#c5b398", 0, 0.01, 13.6, group);
  box(9, 0.08, 17.8, "#c5b398", 0, 0.01, -19.6, group);
  for (const z of [17, -18]) box(57, 0.08, 5, "#bcaa91", 0, 0.01, z, group);
  const water = mesh(
    new THREE.PlaneGeometry(64, 9, 32, 8),
    new THREE.MeshStandardMaterial({
      color: "#287b9e",
      emissive: "#174d70",
      emissiveIntensity: 0.28,
      metalness: 0.55,
      roughness: 0.23,
      transparent: true,
      opacity: 0.93,
    }),
    0,
    -0.14,
    -6,
    group,
  );
  water.name = "festival-river-water";
  water.rotation.x = -Math.PI / 2;
  for (const z of [-10.7, -1.3])
    box(64, 0.35, 0.6, "#8b9184", 0, -0.06, z, group);
  // Continuous rows of full blossom canopies, with a clear opening at the bridge.
  const sakura = new THREE.Group();
  sakura.name = "sakura-riverbanks";
  group.add(sakura);
  const trees = [];
  for (const z of [-13.2, 1.2])
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++) {
        const x = side * (8.5 + i * 4.9),
          h = 3.25 + (i % 3) * 0.22;
        trees.push({ x, z, h });
        cyl(0.2, 0.34, h, "#6e4950", x, h / 2 - 0.08, z, sakura, 9);
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2 + i * 0.8;
          const start = new THREE.Vector3(x, h * 0.65, z);
          const end = new THREE.Vector3(
            x + Math.cos(a) * 1.4,
            h + 1,
            z + Math.sin(a) * 1.1,
          );
          const delta = end.clone().sub(start);
          const branch = cyl(
            0.08,
            0.15,
            delta.length(),
            "#78515a",
            0,
            0,
            0,
            sakura,
            7,
          );
          branch.position.copy(start).add(end).multiplyScalar(0.5);
          branch.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            delta.normalize(),
          );
        }
        blockers.push({ x, z, r: 0.36 });
        // Mossy planting beds and blossom-scattered grass soften the embankments.
        cyl(1.65, 1.85, 0.08, "#5b786b", x, -0.04, z, sakura, 16);
        if (i % 2 === 0) lantern(x, 2.7, z + (z < -6 ? 0.6 : -0.6), sakura);
      }
  const blossoms = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.85,
      emissive: "#6c2b51",
      emissiveIntensity: 0.15,
    }),
    trees.length * 23,
  );
  blossoms.name = "dense-sakura-blossoms";
  blossoms.castShadow = blossoms.receiveShadow = true;
  const transform = new THREE.Object3D(),
    bloomColors = ["#f5b3cf", "#ffcee1", "#df8fb9", "#ffe3ed"].map(
      (c) => new THREE.Color(c),
    );
  trees.forEach(({ x, z, h }, t) => {
    for (let j = 0; j < 23; j++) {
      const a = j * 2.4 + t * 0.4,
        radius = j < 15 ? 1.65 : 0.8;
      transform.position.set(
        x + Math.cos(a) * radius,
        h + (j < 15 ? 0.8 : 1.75) + Math.sin(j * 1.8) * 0.35,
        z + Math.sin(a) * radius * 0.8,
      );
      const size = 0.85 + (j % 4) * 0.13;
      transform.scale.set(size * 1.2, size * 0.83, size);
      transform.rotation.set(j * 0.4, a, 0);
      transform.updateMatrix();
      const index = t * 23 + j;
      blossoms.setMatrixAt(index, transform.matrix);
      blossoms.setColorAt(index, bloomColors[(j + t) % 4]);
    }
  });
  sakura.add(blossoms);
  sakura.userData.treeCount = trees.length;
  const petals = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.12, 0.08),
    new THREE.MeshBasicMaterial({
      color: "#ffd1e4",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    }),
    160,
  );
  petals.name = "drifting-sakura-petals";
  group.add(petals);
  // Rippling rose glints sit on the water underneath the blossom rows.
  for (const { x, z } of trees)
    for (let j = 0; j < 5; j++) {
      const glint = box(
        1.2 + j * 0.2,
        0.012,
        0.08,
        new THREE.MeshBasicMaterial({
          color: "#db8caf",
          transparent: true,
          opacity: 0.2,
        }),
        x,
        -0.115,
        z < -6 ? -10 + j * 0.35 : -2 - j * 0.35,
        group,
      );
      ripples.push({ glint, phase: x + j });
    }
  for (let i = 0; i < 60; i++) {
    const x = -30 + (i % 20) * 3.1,
      z = -9.6 + Math.floor(i / 20) * 3.1;
    const glint = box(
      0.6 + (i % 4) * 0.3,
      0.012,
      0.04,
      new THREE.MeshBasicMaterial({
        color: "#7acbde",
        transparent: true,
        opacity: 0.17,
      }),
      x,
      -0.118,
      z,
      group,
    );
    ripples.push({ glint, phase: i * 0.6 });
  }
  // Bridge is flush at both ends, gently arched at the center.
  for (let i = 0; i < 30; i++) {
    const z = -11.5 + i * 0.38;
    const y = bridgeHeight(0, z);
    box(5.7, 0.16, 0.37, "#b87555", 0, y - 0.08, z, group);
    for (const s of [-1, 1]) {
      if (i % 3 === 0) {
        box(0.16, 1.15, 0.16, "#994e3e", s * 2.9, y + 0.55, z, group);
        blockers.push({ x: s * 2.9, z, r: 0.16 });
      }
      box(0.15, 0.13, 0.4, "#d8996a", s * 2.9, y + 1.05, z, group);
    }
  }
  for (const x of [-3.4, 3.4])
    for (const z of [-12, 0]) {
      cyl(0.09, 0.14, 3.5, "#694d46", x, 1.75, z, group);
      lantern(x, 3.5, z, group, true);
    }
  function roof(parent, w, d, y) {
    for (const side of [-1, 1]) {
      const panel = box(
        w + 1.2,
        0.25,
        d * 0.62,
        "#344054",
        0,
        y,
        side * d * 0.24,
        parent,
      );
      panel.rotation.x = side * 0.28;
      box(w + 1.5, 0.15, 0.22, "#596477", 0, y - 0.25, side * d * 0.55, parent);
    }
    box(w + 1.3, 0.2, 0.3, "#596477", 0, y + 0.35, 0, parent);
  }
  function sign(text, parent, y, z) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f6dfb1";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#6c3c39";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 256, 82);
    const label = mesh(
      new THREE.PlaneGeometry(3.6, 0.9),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        side: THREE.DoubleSide,
      }),
      0,
      y,
      z,
      parent,
    );
    label.name = text;
  }
  const foods = ["TAKOYAKI", "YAKITORI", "KAKIGORI"];
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const x = side * 13,
        z = 20 - i * 8;
      const stall = new THREE.Group();
      stall.position.set(x, 0, z);
      group.add(stall);
      stall.name = `food-stall-${foods[i].toLowerCase()}`;
      box(
        6,
        1.25,
        3.6,
        ["#ab6557", "#69877f", "#857b9b"][i],
        0,
        0.63,
        0,
        stall,
      );
      box(6.3, 0.15, 4, "#dfba85", 0, 1.3, 0, stall);
      for (const sx of [-2.9, 2.9])
        box(0.16, 4, 0.16, "#755043", sx, 2, -1.6, stall);
      roof(stall, 6, 4.2, 4.2);
      sign(foods[i], stall, 3.2, 2.2);
      for (const lx of [-2.3, 2.3]) lantern(lx, 2.8, 2.3, stall, i === 1);
      // Trays of dumplings, skewers and colorful shaved ice.
      for (let j = 0; j < 5; j++) {
        const fx = -1.8 + j * 0.9;
        cyl(0.32, 0.25, 0.12, "#efe1c4", fx, 1.43, 0.6, stall, 12);
        if (i === 2)
          mesh(
            new THREE.ConeGeometry(0.25, 0.5, 12),
            j % 2 ? pink : warm,
            fx,
            1.73,
            0.6,
            stall,
          );
        else {
          for (let k = 0; k < 3; k++)
            ball(
              0.12,
              i ? "#c17c4a" : "#e4b26b",
              fx,
              1.57,
              0.4 + k * 0.18,
              stall,
            );
          if (i === 1) box(0.035, 0.035, 0.9, "#ead0a1", fx, 1.5, 0.6, stall);
        }
      }
      for (const dx of [-2.4, 0, 2.4]) blockers.push({ x: x + dx, z, r: 2 });
    }
  // A timber tea house looks onto the north bank and its small garden.
  const tea = new THREE.Group();
  tea.name = "riverside-tea-house";
  tea.position.set(-15, 0, -21);
  group.add(tea);
  box(12, 0.35, 8, "#97745a", 0, 0.12, 0, tea);
  box(11, 4.3, 0.3, "#d8bb8e", 0, 2.3, -3.4, tea);
  for (const x of [-5.5, 5.5]) box(0.3, 4.8, 7, "#795748", x, 2.4, 0, tea);
  for (let i = -5; i <= 5; i++)
    box(0.08, 3.4, 0.1, "#796253", i, 2.4, -3.15, tea);
  roof(tea, 12, 9, 5);
  sign("お茶 · TEA HOUSE", tea, 3.9, 4.8);
  for (const x of [-4, 4]) lantern(x, 3.2, 3.8, tea, true);
  for (const x of [-2.4, 2.4]) {
    box(2, 0.15, 1.3, "#a9694b", x, 0.9, 1, tea);
    cyl(0.22, 0.27, 0.35, "#93b2a0", x, 1.15, 1, tea);
    ball(0.15, "#93b2a0", x + 0.45, 1.12, 1, tea);
    for (const z of [-0.3, 2.4])
      box(0.85, 0.12, 0.85, "#899e8d", x, 0.4, z, tea);
  }
  for (const x of [-20, -17, -14, -11]) blockers.push({ x, z: -23, r: 1.6 });
  // Smaller shop fronts behind the stalls give the street a rooftop silhouette.
  const houseRows = [23, 14, 6, -27];
  for (const side of [-1, 1])
    for (const z of houseRows) {
      const house = new THREE.Group();
      house.name = "festival-street-house";
      house.position.set(side * 26, 0, z);
      group.add(house);
      box(7, 5, 7, "#8d8079", 0, 2.5, 0, house);
      roof(house, 7, 8, 5.4);
      for (const x of [-2, 0, 2])
        box(0.95, 1.6, 0.08, warm, x, 2.8, 3.54, house);
      blockers.push({ x: side * 26, z, r: 5 });
    }
  for (const z of [23, 15, 7, -17]) {
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const x = -10 + (i * 20) / 12,
        y = 5.3 - Math.sin((i / 12) * Math.PI) * 0.65;
      points.push(new THREE.Vector3(x, y + 0.5, z));
      if (i % 2 === 0) lantern(x, y, z);
    }
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: "#ad8d70" }),
      ),
    );
  }
  for (const x of [10, 17, 24]) {
    cyl(3, 3.3, 0.15, "#517269", x, 0, -21, group, 20);
    for (let j = 0; j < 5; j++) {
      const shrub = ball(
        0.7,
        "#628875",
        x + Math.cos(j * 2) * 2,
        0.5,
        -21 + Math.sin(j * 2) * 2,
        group,
      );
      shrub.scale.y = 0.7;
    }
    cyl(0.2, 0.3, 3.2, "#735749", x, 1.6, -23, group);
    ball(2.1, "#658a7b", x, 3.4, -23, group);
    blockers.push({ x, z: -23, r: 1.3 });
  }
  const flyMat = new THREE.MeshBasicMaterial({
    color: "#eaffac",
    transparent: true,
  });
  for (let i = 0; i < 18; i++) {
    const fly = ball(0.045, flyMat.clone(), 0, 0, 0, group);
    fireflies.push({
      fly,
      x: 8 + (i % 6) * 3,
      z: -18 - Math.floor(i / 6) * 4,
      phase: i * 2.4,
    });
  }
  // Broken horizontal glints on the water reflect the lantern-lit banks.
  for (const x of [-25, -20, -13, -7, 7, 13, 20, 25])
    for (let j = 0; j < 7; j++) {
      const glint = box(
        0.5 + j * 0.12,
        0.012,
        0.1,
        new THREE.MeshBasicMaterial({
          color: "#e5b377",
          transparent: true,
          opacity: 0.28,
        }),
        x,
        -0.12,
        -1.8 - j * 0.46,
        group,
      );
      ripples.push({ glint, phase: x + j, width: glint.scale.x });
    }
  const crowd = createFestivalCrowd({
    parent: group,
    blockers,
    mesh,
    box,
    cyl,
    ball,
  });
  // Each ten-second display is a sky-wide bouquet, followed by quiet blue sky.
  const shells = 5,
    rays = 120,
    trailSteps = 14,
    count = shells * rays;
  const positions = new Float32Array(count * 3),
    mirrored = new Float32Array(count * 3);
  const trails = new Float32Array(count * trailSteps * 6);
  const waterTrails = new Float32Array(trails.length);
  const colors = new Float32Array(trails.length);
  const sparkColors = new Float32Array(positions.length);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(sparkColors, 3));
  const reflectionGeometry = new THREE.BufferGeometry();
  reflectionGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(mirrored, 3),
  );
  reflectionGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(sparkColors, 3),
  );
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trails, 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const waterGeometry = new THREE.BufferGeometry();
  waterGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(waterTrails, 3),
  );
  waterGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  // A radial spark texture gives the tips soft halos instead of square pixels.
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4,
        r = Math.hypot(x - 15.5, y - 15.5) / 16;
      pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - r) ** 2 * 255)], i);
    }
  const glowTexture = new THREE.DataTexture(pixels, 32, 32);
  glowTexture.needsUpdate = true;
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    map: glowTexture,
    size: 0.9,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });
  const fireworks = new THREE.Points(geometry, material);
  fireworks.name = "festival-fireworks";
  fireworks.frustumCulled = false;
  group.add(fireworks);
  const trailMaterial = new THREE.LineBasicMaterial({
    toneMapped: false,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });
  const streaks = new THREE.LineSegments(trailGeometry, trailMaterial);
  streaks.name = "gigantic-firework-trails";
  streaks.frustumCulled = false;
  group.add(streaks);
  const reflectionMaterial = material.clone();
  reflectionMaterial.size = 0.45;
  const reflection = new THREE.Points(reflectionGeometry, reflectionMaterial);
  reflection.name = "fireworks-water-reflection";
  reflection.frustumCulled = false;
  group.add(reflection);
  const waterMaterial = trailMaterial.clone();
  const reflectedStreaks = new THREE.LineSegments(waterGeometry, waterMaterial);
  reflectedStreaks.name = "firework-trail-reflections";
  reflectedStreaks.frustumCulled = false;
  group.add(reflectedStreaks);
  const rocket = ball(0.2, warm, 0, 0, 0, group);
  let festivalTime = 0;
  const palette = ["#ffca48", "#ff408b", "#43b2ff", "#55ffc0", "#c275ff"].map(
    (c) => new THREE.Color(c),
  );
  function update(dt) {
    festivalTime += dt;
    crowd.update(festivalTime);
    const time = festivalTime,
      cycle = Math.floor(time / 10),
      phase = time % 10;
    const age = phase - 1.2;
    rocket.visible = phase < 1.2;
    rocket.position.set(0, 5 + (phase / 1.2) * 31, -48);
    fireworks.visible =
      reflection.visible =
      streaks.visible =
      reflectedStreaks.visible =
        age >= 0 && age < 5.2;
    const fade = Math.min(1, Math.max(0, (5.2 - age) / 1.8));
    material.opacity = trailMaterial.opacity = fade;
    reflectionMaterial.opacity = fade * 0.65;
    waterMaterial.opacity = fade * 0.35;
    for (let i = 0; i < count; i++) {
      const shell = Math.floor(i / rays),
        ray = i % rays;
      const shellAge = Math.max(0, age - shell * 0.16);
      const angle = (ray * Math.PI * 2) / rays + shell * 0.2;
      const speed = 10 + (ray % 7) * 0.45;
      const ring = 0.72 + (ray % 4) * 0.09;
      const cx = [-15, 0, 15, -7, 8][shell],
        cy = [27, 36, 28, 22, 24][shell];
      const color = palette[(ray + shell + cycle) % palette.length];
      const point = (t) => {
        const radius = speed * 1.6 * (1 - Math.exp(-t / 1.6));
        return [
          cx + Math.cos(angle) * radius * ring,
          cy + Math.sin(angle) * radius * ring - t * t * 0.65,
          -48 + Math.sin(ray * 2.4) * radius * 0.12,
        ];
      };
      const tip = point(shellAge);
      const brightness = age >= shell * 0.16 ? 1 : 0;
      positions.set(tip, i * 3);
      sparkColors.set(
        [color.r * brightness, color.g * brightness, color.b * brightness],
        i * 3,
      );
      const reflected = (p) => [
        p[0] * 0.9 + Math.sin(time * 4 + p[1]) * 0.16,
        -0.105,
        -6 + (p[1] - 28) * 0.12,
      ];
      mirrored.set(reflected(tip), i * 3);
      for (let j = 0; j < trailSteps; j++) {
        const offset = (i * trailSteps + j) * 6;
        const t0 = Math.max(0, shellAge - (j + 1) * 0.055);
        const t1 = Math.max(0, shellAge - j * 0.055);
        const from = point(t0),
          to = point(t1);
        trails.set([...from, ...to], offset);
        waterTrails.set([...reflected(from), ...reflected(to)], offset);
        const strength = brightness * (1 - j / trailSteps) * 0.95;
        colors.set(
          [
            color.r * strength,
            color.g * strength,
            color.b * strength,
            color.r * strength,
            color.g * strength,
            color.b * strength,
          ],
          offset,
        );
      }
    }
    for (const g of [
      geometry,
      reflectionGeometry,
      trailGeometry,
      waterGeometry,
    ]) {
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
    }
    const surface = water.geometry.attributes.position;
    for (let i = 0; i < surface.count; i++)
      surface.setZ(
        i,
        Math.sin(surface.getX(i) * 0.55 + time * 1.2 + surface.getY(i) * 0.6) *
          0.006,
      );
    surface.needsUpdate = true;
    for (let i = 0; i < 160; i++) {
      const tree = trees[i % trees.length],
        drift = (time * 0.15 + i * 0.618) % 1;
      transform.position.set(
        tree.x + Math.sin(i * 2.4 + time * 0.5) * 2.4 + drift * 0.7,
        0.08 + (1 - drift) * 5,
        tree.z +
          Math.cos(i * 1.7 + time * 0.3) * 1.7 +
          (tree.z < -6 ? 1 : -1) * drift * 2,
      );
      transform.scale.setScalar(1);
      transform.rotation.set(time * 0.7 + i, time * 0.3 + i, i);
      transform.updateMatrix();
      petals.setMatrixAt(i, transform.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    fireflies.forEach(({ fly, x, z, phase }) => {
      fly.position.set(
        x + Math.sin(time * 0.55 + phase),
        1.1 + Math.sin(time * 0.8 + phase) * 0.55,
        z + Math.cos(time * 0.4 + phase),
      );
      fly.material.opacity = 0.2 + (Math.sin(time * 1.7 + phase) + 1) * 0.4;
    });
    ripples.forEach(({ glint, phase }) => {
      glint.scale.x = 0.8 + Math.sin(time * 2 + phase) * 0.25;
    });
  }
  function bridgeHeight(x, z) {
    return Math.abs(x) <= 2.85 && z >= -11.6 && z <= 0
      ? Math.sin(((z + 11.6) / 11.6) * Math.PI) * 0.55
      : 0;
  }
  const contains = (x, z) =>
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    Math.abs(x) < 31 &&
    Math.abs(z) < 30 &&
    (!(z > -10.5 && z < -1.5) || Math.abs(x) < 2.5);
  update(0);
  return {
    group,
    entrance,
    crowd,
    blockers,
    update,
    contains,
    heightAt: bridgeHeight,
    followDistance: 2.3,
    arrival: new THREE.Vector3(0, 0, 23),
    isEntrance: (p) => Math.abs(p.x) < 2 && Math.abs(p.z + 27) < 1.4,
    isExit: (p) => Math.abs(p.x) < 2 && Math.abs(p.z - 27) < 1.4,
    nearBridge: (p) => Math.abs(p.x) < 2.5 && Math.abs(p.z + 6) < 3,
    restartFireworks() {
      festivalTime = 6.8;
    },
  };
}

export function createSummerOutfits({ rigs, box, cyl }) {
  const additions = [];
  rigs.forEach((rig, index) => {
    const start = additions.length;
    const shirt = new THREE.Group();
    shirt.name = "summer-t-shirt";
    shirt.userData.clothingSlot = "torso";
    rig.body.add(shirt);
    additions.push(shirt);
    const color = index ? "#8bc9cd" : "#ffe098";
    cyl(0.45, 0.53, 0.78, color, 0, 1.28, 0, shirt, 12);
    additions.push(cyl(0.3, 0.33, 0.1, "#f0bd8a", 0, 1.72, 0.03, rig.body, 12));
    box(
      0.24,
      0.17,
      0.025,
      index ? "#f6e5ba" : "#e9a476",
      -0.24,
      1.4,
      0.48,
      shirt,
    );
    rig.legs.forEach((leg) => {
      const summer = new THREE.Group();
      summer.name = "summer-shorts";
      summer.userData.clothingSlot = "trousers";
      leg.add(summer);
      additions.push(summer);
      box(0.34, 0.32, 0.37, index ? "#526f8c" : "#c17e73", 0, 0.04, 0, summer);
      additions.push(box(0.24, 0.35, 0.26, "#f0bd8a", 0, -0.25, 0, leg));
      const shoe = box(0.35, 0.2, 0.52, "#eee4ca", 0, -0.45, 0.1, leg);
      shoe.userData.clothingSlot = "shoes";
      additions.push(shoe);
    });
    rig.arms.forEach((arm, i) => {
      const summer = new THREE.Group();
      summer.userData.clothingSlot = "sleeves";
      arm.add(summer);
      additions.push(summer);
      box(0.34, 0.27, 0.38, color, (i ? 1 : -1) * 0.09, -0.07, 0, summer);
      additions.push(
        cyl(0.13, 0.14, 0.5, "#f0bd8a", (i ? 1 : -1) * 0.09, -0.43, 0.02, arm),
      );
    });
    rig.appearance.registerOutfit("summer", {
      parts: additions.slice(start),
      hideSlots: [
        "torso",
        "sleeves",
        "trousers",
        "shoes",
        "scarf",
        ...(index ? ["headwear"] : []),
      ],
    });
  });
  let releases = [];
  return {
    set(active) {
      releases.forEach((release) => release());
      releases = active
        ? rigs.map((rig, index) =>
            rig.appearance.override({
              outfit: "summer",
              accessories: {
                scarf: null,
                harness: null,
                ...(index ? { headwear: null } : {}),
              },
            }),
          )
        : [];
    },
  };
}

export function createFestivalMoment({
  festival,
  hero,
  companion,
  rigs,
  camera,
}) {
  let elapsed = null,
    originalFov = camera.fov;
  const characters = [hero, companion.character];
  const heads = rigs.map((rig) => ({ head: rig.head }));
  let expressionReleases = [];
  const smooth = (t) => {
    t = THREE.MathUtils.clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  function restore() {
    camera.fov = originalFov;
    camera.updateProjectionMatrix();
    expressionReleases.forEach((release) => release());
    expressionReleases = [];
    heads.forEach(({ head }, i) => {
      head.rotation.set(0, 0, 0);
      rigs[i].body.rotation.x = 0;
      rigs[i].arms.forEach((arm) => arm.rotation.set(0, 0, 0));
    });
  }

  function stop() {
    if (elapsed !== null) restore();
    elapsed = null;
  }
  return {
    get active() {
      return elapsed !== null;
    },
    start() {
      stop();
      originalFov = camera.fov;
      elapsed = 0;
      festival.restartFireworks();
      characters.forEach((character, i) => {
        character.position.set(i ? 0.72 : -0.72, festival.heightAt(0, -6), -6);
        character.rotation.set(0, Math.PI + (i ? -0.12 : 0.12), 0);
        const rig = rigs[i],
          pose = heads[i];
        rig.body.position.set(0, 0, 0);
        expressionReleases.push(
          rig.appearance.override({ expression: "delighted" }),
        );
        pose.head.rotation.x = -0.34;
        [...rig.arms, ...rig.legs].forEach((limb) =>
          limb.rotation.set(0, 0, 0),
        );
        rig.arms[0].rotation.x = -0.16;
        rig.arms[1].rotation.x = -0.16;
      });
    },
    stop,
    update(dt) {
      if (elapsed === null) return;
      elapsed += dt;
      heads.forEach(({ head }, i) => {
        head.rotation.x = -0.34 - Math.sin(elapsed * 0.8 + i * 0.3) * 0.025;
      });
      if (elapsed > 26) stop();
    },
    updateCamera() {
      if (elapsed === null) return;
      const tilt = smooth((elapsed - 2.4) / 4.2);
      // Begin beside their shoulders, sharing their gaze; reveal the whole bouquet.
      camera.position.set(3.8 * (1 - tilt), 3.2 + tilt * 1.5, -1.8 + tilt * 4);
      const skyFov = Math.max(
        originalFov,
        THREE.MathUtils.radToDeg(2 * Math.atan(38 / (camera.aspect * 52))),
      );
      camera.fov = THREE.MathUtils.lerp(
        originalFov,
        Math.min(76, skyFov),
        tilt,
      );
      camera.updateProjectionMatrix();
      camera.lookAt(0, 2.75 + tilt * 24.25, -6 - tilt * 42);
    },
  };
}
