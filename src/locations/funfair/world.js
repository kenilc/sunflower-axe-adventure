import * as THREE from "../../../vendor/three.module.js";

const TAU = Math.PI * 2;
const colors = ["#ed8ca7", "#71c9c6", "#f6cf65", "#a799d7"];

export function createFunfair({ mesh, box, cyl, ball }) {
  const group = new THREE.Group();
  group.name = "sunflower-funfair";
  group.visible = false;
  const blockers = [];
  const balloons = [],
    wavingFlags = [];
  const balloonMaterials = colors.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.32 }),
  );
  function balloonCluster(
    parent,
    x,
    z,
    anchorHeight,
    height,
    count = 5,
    radius = 0.8,
  ) {
    const cluster = new THREE.Group();
    cluster.name = "festive-balloon-cluster";
    cluster.position.set(x, 0, z);
    parent.add(cluster);
    for (let i = 0; i < count; i++) {
      const a = i * 2.4;
      const base = new THREE.Vector3(
        Math.cos(a) * radius * 1.7,
        height + (i % 3) * radius * 1.8,
        Math.sin(a) * radius,
      );
      const balloon = new THREE.Group();
      balloon.name = "festive-balloon";
      balloon.position.copy(base);
      cluster.add(balloon);
      const skin = mesh(
        new THREE.SphereGeometry(radius, 12, 10),
        balloonMaterials[i % colors.length],
        0,
        0,
        0,
        balloon,
      );
      skin.scale.y = 1.25;
      mesh(
        new THREE.ConeGeometry(radius * 0.12, radius * 0.2, 5),
        balloonMaterials[i % colors.length],
        0,
        -radius * 1.3,
        0,
        balloon,
      );
      const shine = ball(
        radius * 0.15,
        "#fff5e4",
        -radius * 0.32,
        radius * 0.45,
        radius * 0.82,
        balloon,
      );
      shine.scale.set(0.65, 1.8, 0.4);
      const tether = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, anchorHeight, 0),
        base.clone().add(new THREE.Vector3(0, -radius * 1.35, 0)),
      ]);
      const string = new THREE.Line(
        tether,
        new THREE.LineBasicMaterial({ color: "#f4e8c8" }),
      );
      cluster.add(string);
      balloons.push({
        balloon,
        base,
        tether,
        radius,
        phase: balloons.length * 1.7,
      });
    }
    return cluster;
  }
  function flagPole(x, z, color, phase) {
    const pole = new THREE.Group();
    pole.name = "funfair-flag-pole";
    pole.position.set(x, 0, z);
    group.add(pole);
    cyl(0.08, 0.13, 6, "#e9d7ad", 0, 3, 0, pole);
    ball(0.15, "#f6cf65", 0, 6.1, 0, pole);
    const vertices = [],
      indices = [],
      segments = 12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      vertices.push(
        0.1 + t * 1.9,
        5.8 - t * 0.55,
        0,
        0.1 + t * 1.9,
        4.7 + t * 0.55,
        0,
      );
      if (i < segments) {
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
    mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.8,
      }),
      0,
      0,
      0,
      pole,
    );
    wavingFlags.push({ geometry, phase, segments });
    blockers.push({ x, z, r: 0.16 });
  }
  const entrance = new THREE.Group();
  entrance.position.set(32, 0, 0);
  entrance.rotation.y = Math.PI / 2;
  const returnGate = new THREE.Group();
  returnGate.position.set(0, 0, 29);
  group.add(returnGate);
  function flower(parent, x, y, z, size = 1) {
    for (let i = 0; i < 10; i++) {
      const a = (i * TAU) / 10;
      const petal = ball(
        size * 0.32,
        "#f8ce59",
        x + Math.cos(a) * size * 0.55,
        y + Math.sin(a) * size * 0.55,
        z,
        parent,
      );
      petal.scale.z = 0.35;
    }
    const center = ball(size * 0.36, "#8f583e", x, y, z + size * 0.12, parent);
    center.scale.z = 0.4;
  }
  function gate(parent) {
    parent.name = "funfair-gate";
    for (const s of [-1, 1]) {
      cyl(0.24, 0.32, 4.5, "#68b5b0", s * 2.6, 2.25, 0, parent);
      flower(parent, s * 2.6, 4.5, 0, 0.75);
    }
    box(5.7, 0.65, 0.45, "#e990a7", 0, 4.05, 0, parent);
    flower(parent, 0, 4.7, 0, 0.9);
    for (let i = 0; i < 9; i++)
      ball(0.09, "#fff0b3", -2.2 + i * 0.55, 4.04, 0.28, parent);
  }
  gate(entrance);
  gate(returnGate);
  // These float above the tallest garden trees and mark the east entrance.
  for (const side of [-1, 1])
    balloonCluster(entrance, side * 3.4, 0, 4.3, 12.5, 5, 0.95);
  for (const side of [-1, 1])
    balloonCluster(returnGate, side * 3.4, 0, 4.3, 7, 3, 0.65);
  for (const [x, z] of [
    [-26, 11],
    [25, 10],
    [-25, -18],
    [25, -18],
  ]) {
    cyl(0.075, 0.12, 3.4, "#e9d7ad", x, 1.7, z, group);
    blockers.push({ x, z, r: 0.15 });
    balloonCluster(group, x, z, 3.4, 6.5, 4, 0.7);
  }
  [
    [-9, 21],
    [9, 21],
    [-25, 4],
    [25, 4],
    [-9, -18],
    [9, -18],
  ].forEach(([x, z], i) => flagPole(x, z, colors[i % colors.length], i));
  for (const s of [-1, 1]) blockers.push({ x: s * 2.6, z: 29, r: 0.32 });
  cyl(40, 41, 2, "#80a976", 0, -1.03, 0, group, 96);
  cyl(8, 8, 0.08, "#efdfb9", 0, 0, 4, group, 64);
  function path(x, z, w, d) {
    box(w, 0.045, d, "#efdfb9", x, 0.015, z, group);
  }
  path(0, 17, 5, 25);
  path(0, 3, 34, 4);
  path(-15, -1, 4, 12);
  path(15, -1, 4, 12);
  path(7, 17, 18, 3.5);
  // A central sunflower fountain leaves wide paths on both sides.
  cyl(1.7, 2, 0.4, "#d7b98c", 0, 0.2, 4, group, 32);
  cyl(1.55, 1.55, 0.05, "#77d0d4", 0, 0.43, 4, group, 32);
  cyl(0.1, 0.15, 2.8, "#658c58", 0, 1.7, 4, group);
  flower(group, 0, 3.3, 4, 0.9);
  blockers.push({ x: 0, z: 4, r: 2 });
  // Low perimeter posts and flower beds frame the park without hiding the rides.
  for (let i = 0; i < 64; i++) {
    const a = (i * TAU) / 64,
      x = Math.cos(a) * 38,
      z = Math.sin(a) * 38;
    cyl(0.1, 0.13, 1, "#f3e6c7", x, 0.5, z, group);
    const rail = box(3.75, 0.12, 0.12, "#f3e6c7", x, 0.78, z, group);
    rail.rotation.y = -a + Math.PI / 2;
    if (i % 2 === 0) {
      cyl(0.08, 0.08, 1.5, "#638952", x * 0.95, 0.75, z * 0.95, group);
      flower(group, x * 0.95, 1.65, z * 0.95, 0.55);
    }
  }
  function beam(a, b, radius, color, parent) {
    const delta = b.clone().sub(a);
    const pole = cyl(radius, radius, delta.length(), color, 0, 0, 0, parent, 8);
    pole.position.copy(a).add(b).multiplyScalar(0.5);
    pole.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
  }
  const ferris = new THREE.Group();
  ferris.name = "ferris-wheel";
  ferris.position.set(-15, 0, -7);
  group.add(ferris);
  cyl(5.6, 5.6, 0.15, "#dccca7", 0, 0.04, 0, ferris, 48);
  for (const z of [-1.6, 1.6])
    for (const x of [-3.3, 3.3]) {
      beam(
        new THREE.Vector3(x, 0.2, z),
        new THREE.Vector3(0, 10, z),
        0.2,
        "#79bebb",
        ferris,
      );
      blockers.push({ x: -15 + x, z: -7 + z, r: 0.4 });
    }
  beam(
    new THREE.Vector3(0, 10, -2),
    new THREE.Vector3(0, 10, 2),
    0.27,
    "#e1b657",
    ferris,
  );
  const wheel = new THREE.Group();
  wheel.position.y = 10;
  ferris.add(wheel);
  for (const z of [-0.5, 0.5]) {
    mesh(new THREE.TorusGeometry(8, 0.15, 8, 80), "#f4cb68", 0, 0, z, wheel);
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      beam(
        new THREE.Vector3(0, 0, z),
        new THREE.Vector3(Math.cos(a) * 8, Math.sin(a) * 8, z),
        0.065,
        "#f3e4be",
        wheel,
      );
    }
  }
  flower(wheel, 0, 0, 0.7, 1.2);
  const cabins = [];
  for (let i = 0; i < 8; i++) {
    const cabin = new THREE.Group();
    cabin.name = "ferris-cabin-" + i;
    ferris.add(cabin);
    box(2.7, 0.22, 2.1, colors[i % 4], 0, -0.15, 0, cabin);
    box(2.7, 0.75, 0.15, colors[i % 4], 0, 0.3, -1, cabin);
    for (const side of [-1, 1]) {
      box(0.12, 0.65, 2.1, colors[i % 4], side * 1.32, 0.25, 0, cabin);
      cyl(0.055, 0.055, 2.8, "#f3e4be", side * 1.2, 1.3, -0.8, cabin);
    }
    box(2.9, 0.16, 2.3, colors[i % 4], 0, 2.7, 0, cabin);
    box(2.45, 0.15, 0.7, "#f2deb4", 0, 0.4, -0.35, cabin);
    cabins.push(cabin);
  }
  box(3.8, 0.2, 3, "#d8b88a", -15, 0.09, 5, group);
  const ferrisBoard = new THREE.Vector3(-15, 0, 5.8);
  const carousel = new THREE.Group();
  carousel.name = "woodland-carousel";
  carousel.position.set(15, 0, -7);
  group.add(carousel);
  cyl(5.5, 5.7, 0.3, "#e5c5a0", 0, 0.12, 0, carousel, 48);
  const platform = new THREE.Group();
  carousel.add(platform);
  cyl(5.25, 5.25, 0.15, "#e8a3b5", 0, 0.33, 0, platform, 48);
  cyl(0.4, 0.45, 5.7, "#f6df9a", 0, 3.15, 0, carousel, 16);
  for (let i = 0; i < 12; i++) {
    const roof = mesh(
      new THREE.ConeGeometry(6.1, 2.3, 4, 1, false, (i * TAU) / 12, TAU / 12),
      colors[i % 4],
      0,
      6.1,
      0,
      carousel,
    );
    roof.material.side = THREE.DoubleSide;
  }
  flower(carousel, 0, 7.6, 0, 0.9);
  const mounts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + (i * TAU) / 6;
    const mount = new THREE.Group();
    mount.position.set(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5);
    mount.rotation.y = -a;
    platform.add(mount);
    cyl(0.045, 0.045, 5.4, "#f8dc91", 0, 3, 0, mount);
    const animal = new THREE.Group();
    mount.add(animal);
    const coat = i % 2 ? "#ccad88" : "#f5e6c9";
    const torso = ball(0.7, coat, 0, 1.1, 0, animal);
    torso.scale.set(0.65, 0.7, 1.3);
    ball(0.4, coat, 0, 1.65, 0.65, animal);
    for (const side of [-1, 1]) {
      const ear = ball(0.14, coat, side * 0.2, 2, 0.62, animal);
      ear.scale.y = i % 2 ? 2 : 1.3;
      ball(0.05, "#4d493a", side * 0.28, 1.72, 0.88, animal);
      for (const z of [-0.4, 0.4])
        cyl(0.09, 0.11, 0.6, coat, side * 0.28, 0.6, z, animal);
    }
    box(0.85, 0.15, 0.65, colors[i % 4], 0, 1.6, -0.15, animal);
    mounts.push({ mount, animal });
  }
  // The ride platform is reserved for boarding; walk up to the south steps.
  blockers.push({ x: 15, z: -7, r: 5.5 });
  const carouselBoard = new THREE.Vector3(15, 0, 0.5);
  const booth = new THREE.Group();
  booth.name = "ring-toss-booth";
  booth.position.set(14, 0, 13);
  group.add(booth);
  box(7, 1.2, 2.8, "#79bebb", 0, 0.6, 0, booth);
  box(7.2, 0.15, 3, "#f2dfb9", 0, 1.25, 0, booth);
  for (const x of [-3.5, 3.5]) {
    cyl(0.08, 0.08, 3.8, "#f3deb1", x, 1.9, -1, booth);
    blockers.push({ x: 14 + x, z: 12, r: 0.18 });
  }
  for (let i = 0; i < 10; i++) {
    box(
      0.72,
      0.18,
      3.8,
      i % 2 ? "#fff0cc" : "#ed8ca7",
      -3.24 + i * 0.72,
      3.8,
      0,
      booth,
    );
    box(
      0.72,
      0.45,
      0.1,
      i % 2 ? "#fff0cc" : "#ed8ca7",
      -3.24 + i * 0.72,
      3.5,
      1.85,
      booth,
    );
  }
  flower(booth, 0, 4.2, 1.9, 0.6);
  for (const x of [-2.6, -1.3, 0, 1.3, 2.6])
    blockers.push({ x: 14 + x, z: 13, r: 1.1 });
  const pegs = [],
    prizes = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 2.2;
    cyl(0.09, 0.11, 0.7, colors[i], x, 1.68, 0.5, booth);
    pegs.push(new THREE.Vector3(14 + x, 1.36, 13.5));
    const plush = new THREE.Group();
    plush.name = ["sunflower-bear", "mint-bunny", "golden-fox"][i];
    plush.position.set(x, 1.3, -0.8);
    booth.add(plush);
    ball(0.3, colors[i], 0, 0.3, 0, plush);
    ball(0.24, colors[i], 0, 0.7, 0, plush);
    for (const side of [-1, 1]) {
      const ear = ball(0.11, colors[i], side * 0.18, 0.92, 0, plush);
      ear.scale.y = i === 1 ? 2.2 : 1;
      ball(0.03, "#49483b", side * 0.09, 0.75, 0.21, plush);
      ball(0.1, colors[i], side * 0.24, 0.35, 0.02, plush);
    }
    prizes.push(plush);
  }
  const tossSpot = new THREE.Vector3(14, 0, 17);
  cyl(1.2, 1.2, 0.06, "#f5d583", 14, 0.04, 17, group, 32);
  const ring = mesh(
    new THREE.TorusGeometry(0.28, 0.055, 8, 24),
    "#ffe29a",
    14,
    1.4,
    16,
    group,
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  // The booth has its own eye-level scene, so the player and park scenery do
  // not obstruct a throw. Clones share the existing geometry and materials.
  const tossScene = new THREE.Scene();
  tossScene.name = "first-person-ring-toss";
  tossScene.background = new THREE.Color("#b9deda");
  tossScene.add(new THREE.HemisphereLight(0xfff4cf, 0xd6c199, 2.4));
  const boothLight = new THREE.DirectionalLight(0xffe6a7, 3.4);
  boothLight.position.set(8, 12, 20);
  boothLight.target.position.copy(booth.position);
  tossScene.add(boothLight, boothLight.target);
  const boothView = booth.clone(true);
  tossScene.add(boothView);
  box(11, 0.1, 12, "#efdfb9", 14, -0.06, 14, tossScene);
  box(8, 4, 0.15, "#8bbfb1", 14, 2, 10.8, tossScene);
  const tossRing = ring.clone();
  tossScene.add(tossRing);
  const targetHalo = mesh(
    new THREE.TorusGeometry(0.28, 0.025, 8, 32),
    new THREE.MeshBasicMaterial({ color: "#76efb1" }),
    0,
    0,
    0,
    tossScene,
  );
  targetHalo.rotation.x = Math.PI / 2;
  const tossCamera = new THREE.PerspectiveCamera(60, 1, 0.05, 40);
  tossCamera.position.set(14, 2.15, 17.6);
  function syncTossView(target = 0) {
    const peg = pegs[Math.min(target, 2)];
    tossCamera.lookAt(peg.x, 1.65, peg.z);
    targetHalo.position.copy(peg).add(new THREE.Vector3(0, 0.035, 0));
    tossRing.position.copy(ring.position);
    tossRing.rotation.copy(ring.rotation);
    tossRing.visible = ring.visible;
    prizes.forEach((prize) => {
      tossScene.getObjectByName(prize.name).visible = prize.visible;
    });
  }
  syncTossView();
  // Picnic seating and lanterns make the plaza feel like a small fairground.
  for (const x of [-17, -23]) {
    box(3.5, 0.18, 1.5, "#c6a47b", x, 1.2, 17, group);
    for (const side of [-1, 1]) {
      box(3.5, 0.15, 0.5, "#e4bb88", x, 0.65, 17 + side * 1.5, group);
      for (const dx of [-1.3, 1.3])
        cyl(0.08, 0.08, 1.1, "#8b785e", x + dx, 0.55, 17 + side, group);
      blockers.push({ x, z: 17 + side * 1.5, r: 1.8 });
    }
    blockers.push({ x, z: 17, r: 1.8 });
  }
  for (const x of [-6, 6])
    for (const z of [-17, 13, 24]) {
      cyl(0.08, 0.12, 3.2, "#72918a", x, 1.6, z, group);
      ball(
        0.28,
        new THREE.MeshBasicMaterial({ color: "#ffe4a0" }),
        x,
        3.25,
        z,
        group,
      );
      blockers.push({ x, z, r: 0.15 });
    }
  const bunting = new THREE.Group();
  group.add(bunting);
  beam(
    new THREE.Vector3(-6, 3.2, 24),
    new THREE.Vector3(6, 3.2, 24),
    0.025,
    "#e6d5ac",
    bunting,
  );
  for (let i = 0; i < 15; i++) {
    const flag = mesh(
      new THREE.ConeGeometry(0.25, 0.55, 3),
      colors[i % 4],
      -5.6 + i * 0.8,
      2.9,
      24,
      bunting,
    );
    flag.rotation.z = Math.PI;
    flag.scale.z = 0.1;
  }
  // More bunting spans the plaza and ride paths above head height.
  for (const [halfWidth, z] of [
    [9, 21],
    [25, 4],
    [9, -18],
  ]) {
    const count = Math.round(halfWidth * 1.5);
    const points = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = -halfWidth + halfWidth * 2 * t;
      const y = 5.5 - Math.sin(t * Math.PI) * 0.7;
      points.push(new THREE.Vector3(x, y, z));
      if (i < count) {
        const flag = mesh(
          new THREE.ConeGeometry(0.25, 0.55, 3),
          colors[i % colors.length],
          x,
          y - 0.25,
          z,
          bunting,
        );
        flag.rotation.z = Math.PI;
        flag.scale.z = 0.1;
      }
    }
    bunting.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: "#f4e8c8" }),
      ),
    );
  }
  function update(time, angle = 0, carouselAngle = 0) {
    wheel.rotation.z = angle;
    cabins.forEach((c, i) => {
      const a = -Math.PI / 2 + (i * TAU) / 8 + angle;
      c.position.set(Math.cos(a) * 8, 10 + Math.sin(a) * 8, 0);
    });
    platform.rotation.y = carouselAngle;
    mounts.forEach(({ animal }, i) => {
      animal.position.y = Math.sin(carouselAngle * 2 + (i * TAU) / 6) * 0.18;
    });
    bunting.rotation.x = Math.sin(time * 1.5) * 0.012;
    balloons.forEach(({ balloon, base, tether, radius, phase }) => {
      balloon.position.set(
        base.x + Math.sin(time * 0.8 + phase) * 0.18,
        base.y + Math.sin(time * 1.1 + phase) * 0.16,
        base.z + Math.cos(time * 0.7 + phase) * 0.12,
      );
      balloon.rotation.z = Math.sin(time * 0.8 + phase) * 0.06;
      const string = tether.getAttribute("position");
      string.setXYZ(
        1,
        balloon.position.x,
        balloon.position.y - radius * 1.35,
        balloon.position.z,
      );
      string.needsUpdate = true;
      tether.computeBoundingSphere();
    });
    wavingFlags.forEach(({ geometry, phase, segments }) => {
      const position = geometry.getAttribute("position");
      for (let i = 0; i <= segments; i++) {
        const wave =
          ((Math.sin((i / segments) * Math.PI * 3 - time * 2 + phase) * i) /
            segments) *
          0.18;
        position.setZ(i * 2, wave);
        position.setZ(i * 2 + 1, wave);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    });
  }
  update(0);
  return {
    group,
    entrance,
    returnGate,
    blockers,
    cabins,
    mounts,
    platform,
    ring,
    tossScene,
    tossCamera,
    tossRing,
    targetHalo,
    syncTossView,
    pegs,
    prizes,
    ferrisBoard,
    carouselBoard,
    tossSpot,
    arrival: new THREE.Vector3(0, 0, 19),
    contains: (x, z) =>
      Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x, z) < 37,
    heightAt: () => 0,
    isEntrance: (p) => Math.abs(p.x - 32) < 1.2 && Math.abs(p.z) < 1.8,
    isExit: (p) => Math.abs(p.x) < 1.8 && Math.abs(p.z - 29) < 1.2,
    update,
  };
}

export function createFunfairActivities({
  park,
  hero,
  heroRig,
  companion,
  toast,
  onPrize,
}) {
  const rigs = [heroRig, companion.rig],
    characters = [hero, companion.character];
  const prizeNames = ["Sunflower Bear", "Mint Bunny", "Golden Fox"];
  const won = new Set();
  let ride = null,
    elapsed = 0,
    phase = "idle",
    playing = false,
    aimTime = 0,
    flight = 0,
    hit = false;
  let ringStart = new THREE.Vector3(),
    ringEnd = new THREE.Vector3();
  const near = (p) =>
    Math.hypot(hero.position.x - p.x, hero.position.z - p.z) < 2.6;
  const aimValue = () => Math.sin(aimTime * 2.1);
  function restore() {
    rigs.forEach((rig) => {
      rig.body.position.set(0, 0, 0);
      [...rig.legs, ...rig.arms].forEach((limb) => limb.rotation.set(0, 0, 0));
      if (rig.held) rig.held.visible = false;
    });
    characters.forEach((c) => c.rotation.set(0, 0, 0));
  }
  function stop(notify = true) {
    if (!ride) return false;
    const landing = ride === "ferris" ? park.ferrisBoard : park.carouselBoard;
    ride = null;
    restore();
    hero.position.copy(landing);
    companion.reset(landing, park.blockers, park);
    if (notify) toast("Back in the plaza · Ready for another ride!");
    return true;
  }
  function poseRide() {
    park.group.updateWorldMatrix(true, true);
    characters.forEach((c, i) => {
      if (ride === "ferris") {
        const seat = park.cabins[0];
        c.position.copy(
          seat.localToWorld(new THREE.Vector3(i ? 0.65 : -0.65, 0.03, -0.15)),
        );
        c.rotation.y = 0;
      } else {
        const { mount, animal } = park.mounts[i];
        c.position.copy(
          mount.localToWorld(
            new THREE.Vector3(0, 1.05 + animal.position.y, -0.25),
          ),
        );
        c.quaternion.copy(mount.getWorldQuaternion(new THREE.Quaternion()));
      }
      const rig = rigs[i];
      rig.body.position.y = 0;
      rig.legs.forEach((l) => {
        l.rotation.x = -Math.PI / 2.6;
      });
      rig.arms.forEach((a) => {
        a.rotation.x = -0.65;
      });
      if (rig.held) rig.held.visible = false;
    });
  }
  function leaveToss() {
    if (!playing) return false;
    playing = false;
    phase = "idle";
    park.ring.visible = false;
    park.syncTossView(won.size);
    return true;
  }
  function nearby() {
    if (playing)
      return {
        kind: "toss",
        label:
          phase === "flying"
            ? "Ring in the air…"
            : phase === "aiming"
              ? "Throw when the marker is green · X"
              : "Throw next ring · X",
      };
    if (ride) return { kind: ride, label: "Finish ride · X" };
    if (near(park.ferrisBoard))
      return { kind: "ferris", label: "Ride Ferris wheel together · X" };
    if (near(park.carouselBoard))
      return { kind: "carousel", label: "Ride woodland carousel · X" };
    if (near(park.tossSpot))
      return {
        kind: "toss",
        label:
          phase === "flying"
            ? "Ring in the air…"
            : phase === "aiming"
              ? "Throw when the marker is green · X"
              : won.size === 3
                ? "All three plush prizes won!"
                : "Play ring toss · X",
      };
    return null;
  }
  return {
    nearby,
    get riding() {
      return ride !== null;
    },
    get ride() {
      return ride;
    },
    get collected() {
      return won.size;
    },
    get playing() {
      return playing;
    },
    leaveToss,
    get aiming() {
      return phase === "aiming";
    },
    get throwing() {
      return phase === "flying";
    },
    get aim() {
      return aimValue();
    },
    get target() {
      return [-0.7, 0, 0.7][won.size] ?? 0;
    },
    objective() {
      return won.size === 3
        ? "All three plush prizes won! Enjoy the rides together."
        : "Ride together and win three plush prizes at the ring-toss booth.";
    },
    interact() {
      const action = nearby();
      if (!action) return false;
      if (ride) return stop();
      if (action.kind !== "toss") {
        ride = action.kind;
        elapsed = 0;
        phase = "idle";
        restore();
        park.update(0);
        poseRide();
        toast(
          ride === "ferris"
            ? "A sunflower view for two ♥ · X to finish early."
            : "Around the woodland carousel together ♥ · X to finish early.",
        );
        return true;
      }
      if (won.size === 3 || phase === "flying") return false;
      if (phase === "idle") {
        playing = true;
        phase = "aiming";
        aimTime = 0;
        hero.rotation.y = Math.PI;
        park.ring.visible = true;
        park.ring.rotation.set(Math.PI / 2, 0, 0);
        park.syncTossView(won.size);
        park.ring.position
          .set(0.62, -0.46, -1.65)
          .applyQuaternion(park.tossCamera.quaternion)
          .add(park.tossCamera.position);
        park.syncTossView(won.size);
        toast(
          "First-person ring toss · X, Space or click when the marker reaches green.",
        );
      } else {
        hit = Math.abs(aimValue() - this.target) <= 0.2;
        ringStart.copy(park.ring.position);
        ringEnd.copy(park.pegs[won.size]);
        if (!hit) ringEnd.x += (aimValue() - this.target) * 3;
        phase = "flying";
        flight = 0;
        park.ring.visible = true;
        park.ring.position.copy(ringStart);
      }
      return true;
    },
    stop,
    reset(clearPrizes = false) {
      stop(false);
      leaveToss();
      phase = "idle";
      park.ring.visible = false;
      park.update(0);
      if (clearPrizes) {
        won.clear();
        park.prizes.forEach((p) => {
          p.visible = true;
        });
      }
      park.syncTossView(won.size);
    },
    update(dt, time) {
      if (ride) {
        elapsed += dt;
        const duration = ride === "ferris" ? 24 : 16;
        const angle = Math.min(elapsed / duration, 1) * TAU;
        park.update(
          time,
          ride === "ferris" ? angle : 0,
          ride === "carousel" ? -angle : 0,
        );
        poseRide();
        if (elapsed >= duration) stop();
      } else park.update(time);
      if (phase === "aiming") {
        aimTime += dt;
      }
      if (phase === "flying") {
        flight = Math.min(1, flight + dt);
        park.ring.position.lerpVectors(ringStart, ringEnd, flight);
        park.ring.position.y += Math.sin(flight * Math.PI) * 0.8;
        park.ring.rotation.z += dt * 5;
        if (flight >= 1) {
          park.ring.visible = false;
          phase = "idle";
          if (hit) {
            const index = won.size;
            won.add(index);
            park.prizes[index].visible = false;
            toast(`${prizeNames[index]} won · ${won.size} / 3 plush prizes!`);
            onPrize(won.size, park.pegs[index].clone());
            if (won.size === 3) leaveToss();
          } else
            toast(
              "So close! Play again and throw when the marker reaches green.",
            );
        }
      }
      park.syncTossView(won.size);
    },
  };
}
