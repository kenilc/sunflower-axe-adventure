import * as THREE from "three";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createTreeVisibility } from "../../rendering/tree-visibility.js";
import { createLakeside, inLake, reservedLakeside } from "./lakeside.js";

export function createGarden({ scene, rand, benchModel }) {
  const group = new THREE.Group();
  scene.add(group);
  const { mesh, box, cyl, ball, mat } = createMeshFactory(group);
  const ground = cyl(53, 56, 2.5, "#557e4a", 0, -1.28, 0, group, 80);
  const pathMat = mat("#b8ac73");
  function path(x, z, w, d, rot = 0) {
    const p = box(w, 0.04, d, pathMat, x, 0.025, z);
    p.rotation.y = rot;
  }
  path(0, 0, 5, 70);
  path(0, 0, 64, 4);
  path(-12, -12, 4, 28, -0.7);
  path(13, 10, 4, 28, -0.8);
  path(23, -20, 3.7, 12);
  const reservedWinterGate = (x, z) => Math.hypot(x - 23, z + 25) < 7;
  const blockers = [];
  const lakeside = createLakeside({ mesh, box, cyl, ball, benchModel });
  group.add(lakeside.group);
  blockers.push({ x: 6.4, z: 9.6, r: 1.5 });
  const terrain = {
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
    group.add(g);
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
      reservedWinterGate(x, z) ||
      Math.hypot(x - 6.4, z - 9.6) < 7
    )
      continue;
    tree(x, z, 0.65 + rand() * 0.8);
  }
  for (let i = 0; i < 45; i++) {
    let x = (rand() - 0.5) * 88,
      z = (rand() - 0.5) * 88;
    if (
      Math.abs(x) > 5 &&
      Math.abs(z) > 5 &&
      !reservedLakeside(x, z) &&
      !reservedWinterGate(x, z)
    )
      rock(x, z, 0.4 + rand() * 1.1);
  }
  for (let i = 0; i < 550; i++) {
    const x = (rand() - 0.5) * 96,
      z = (rand() - 0.5) * 96;
    if (
      Math.hypot(x, z) > 49 ||
      Math.abs(x) < 3 ||
      Math.abs(z) < 2.4 ||
      reservedLakeside(x, z) ||
      reservedWinterGate(x, z)
    )
      continue;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    group.add(g);
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
    if (reservedLakeside(x, z) || reservedWinterGate(x, z)) return;
    const flower = new THREE.Group();
    flower.position.set(x, 0, z);
    flower.scale.setScalar(size);
    flower.rotation.y = rand() * Math.PI * 2;
    group.add(flower);
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
    group.add(g);
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
  group.add(shrine);
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
  group.add(glow);
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
    group.add(g);
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
    group.add(g);
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
  return {
    group,
    terrain,
    blockers,
    lakeside,
    treeVisibility,
    shrine,
    relic,
    ring,
    gems,
    targets,
    gemPositions,
    pathMat,
  };
}
