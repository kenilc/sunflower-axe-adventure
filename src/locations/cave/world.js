import * as THREE from "three";

export function createCave() {
  const interior = new THREE.Group();
  interior.visible = false;
  const entrance = new THREE.Group();
  entrance.position.set(0, 0, -43);
  const walls = [],
    sparkles = [],
    flames = [],
    blockers = [];
  let seed = 731;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  const stone = new THREE.MeshStandardMaterial({
    color: "#47423c",
    roughness: 1,
    flatShading: true,
  });
  const earth = new THREE.MeshStandardMaterial({
    color: "#433b31",
    roughness: 1,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: "#ffc84e",
    metalness: 0.7,
    roughness: 0.3,
    emissive: "#ae6413",
    emissiveIntensity: 0.17,
    flatShading: true,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: "#674027",
    roughness: 0.85,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#dca644",
    metalness: 0.65,
    roughness: 0.35,
  });
  const dark = new THREE.MeshBasicMaterial({
    color: "#100f16",
    side: THREE.DoubleSide,
  });
  function add(geometry, material, x, y, z, parent = interior) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (w, h, d, m, x, y, z, p) =>
    add(new THREE.BoxGeometry(w, h, d), m, x, y, z, p);
  function boulder(x, y, z, sx, sy, sz, parent = interior) {
    const m = add(new THREE.IcosahedronGeometry(1, 1), stone, x, y, z, parent);
    m.scale.set(sx, sy, sz);
    m.rotation.y = random() * 6;
    if (parent !== entrance) {
      m.name = "cave-rock";
      const center = m.getWorldPosition(new THREE.Vector3());
      // Enclose the rotated rock footprint and allow room for the hood/arms.
      blockers.push({
        x: center.x,
        z: center.z,
        r: Math.max(sx, sz),
        minClearance: 0.8,
      });
    }
    return m;
  }
  // A walk-through opening on the north trail.
  box(5.2, 5.6, 0.2, dark, 0, 2.7, -1, entrance);
  for (const side of [-1, 1]) {
    boulder(side * 4, 2.1, 0, 2.5, 3.1, 2.2, entrance);
    boulder(side * 3.3, 4.4, 0, 1.9, 1.7, 1.8, entrance);
  }
  boulder(0, 6, 0, 3.6, 1.8, 2, entrance);
  function torch(x, y, z, parent) {
    box(0.15, 0.85, 0.15, wood, x, y - 0.45, z, parent);
    add(
      new THREE.ConeGeometry(0.2, 0.55, 6),
      new THREE.MeshBasicMaterial({ color: "#ffb347" }),
      x,
      y + 0.1,
      z,
      parent,
    );
    const l = new THREE.PointLight("#ffb34c", 18, 11, 1.6);
    l.position.set(x, y + 0.3, z);
    parent.add(l);
    flames.push(l);
  }
  torch(-2.6, 2.2, 1.1, entrance);
  torch(2.6, 2.2, 1.1, entrance);
  // The chamber is rendered as a cutaway so camera rotation never hides the hero.
  add(new THREE.CylinderGeometry(18, 19, 0.8, 64), earth, 0, -0.42, 0);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2,
      x = Math.sin(a) * 18,
      z = Math.cos(a) * 18;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    interior.add(g);
    boulder(0, 3, 0, 3.5, 5 + random() * 2, 2.3, g);
    const top = add(new THREE.ConeGeometry(0.7, 2.6, 6), stone, 0, 6, 0, g);
    top.rotation.z = Math.PI;
    walls.push(g);
  }
  // Low steps mark the return passage at the south side of the chamber.
  box(
    5,
    0.12,
    5,
    new THREE.MeshStandardMaterial({ color: "#918c6b" }),
    0,
    0.02,
    13,
  );
  for (const side of [-1, 1]) {
    boulder(side * 3, 2.2, 14, 1.1, 2.7, 1.1);
    torch(side * 3, 3, 12, interior);
  }
  const daylight = new THREE.PointLight("#a7d2dd", 28, 15, 1.5);
  daylight.position.set(0, 3, 15);
  interior.add(daylight);
  // A broad mountain of coins, with every surface coin rendered as a real 3D disk.
  const radius = 7,
    centerZ = -5;
  const height = (r, a) =>
    0.22 * Math.min(1, Math.max(0, (radius - r) / 0.5)) +
    4.5 * Math.pow(Math.max(0, 1 - r / radius), 1.25) +
    0.14 * Math.sin(a * 5) * Math.sin((Math.PI * r) / radius);
  const vertices = [],
    indices = [],
    rings = 24,
    segments = 64;
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i <= segments; i++) {
      const r = (radius * j) / rings,
        a = (i / segments) * Math.PI * 2;
      vertices.push(Math.cos(a) * r, height(r, a), centerZ + Math.sin(a) * r);
    }
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i,
        b = a + segments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const moundGeo = new THREE.BufferGeometry();
  moundGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  moundGeo.setIndex(indices);
  moundGeo.computeVertexNormals();
  add(moundGeo, gold, 0, 0, 0);
  const count = 2400,
    coins = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.065, 12),
      gold,
      count,
    );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    if (i < 2000) {
      const a = random() * Math.PI * 2,
        r = Math.sqrt(random()) * radius;
      dummy.position.set(
        Math.cos(a) * r,
        height(r, a) + 0.07,
        centerZ + Math.sin(a) * r,
      );
      dummy.rotation.set(
        (random() - 0.5) * 0.65,
        random() * 6,
        (random() - 0.5) * 0.65,
      );
    } else {
      const a = random() * Math.PI * 2,
        r = 7 + random() * 4;
      dummy.position.set(Math.cos(a) * r, 0.075, centerZ + Math.sin(a) * r);
      dummy.rotation.set(0, random() * 6, 0);
    }
    dummy.scale.setScalar(0.8 + random() * 0.5);
    dummy.updateMatrix();
    coins.setMatrixAt(i, dummy.matrix);
    coins.setColorAt(
      i,
      new THREE.Color().setHSL(
        0.105 + random() * 0.035,
        0.82,
        0.48 + random() * 0.18,
      ),
    );
  }
  coins.receiveShadow = true;
  interior.add(coins);
  // Tall stacks, open wooden chests and colored gems echo the reference treasure.
  const stacks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.07, 12),
    gold,
    300,
  );
  let index = 0;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2,
      r = 7.4 + random() * 2,
      x = Math.cos(a) * r,
      z = centerZ + Math.sin(a) * r;
    for (let j = 0; j < 10; j++) {
      dummy.position.set(x, 0.09 + j * 0.08, z);
      dummy.rotation.set(0, a, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      stacks.setMatrixAt(index++, dummy.matrix);
    }
  }
  stacks.castShadow = stacks.receiveShadow = true;
  interior.add(stacks);
  for (const [x, z, rotation] of [
    [-8, 1, 0.4],
    [8, -1, -0.55],
    [-6, -12, 1],
    [6, 4, -0.25],
  ]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    interior.add(g);
    box(2.1, 1.1, 1.35, wood, 0, 0.65, 0, g);
    box(1.85, 0.12, 1.1, gold, 0, 1.23, 0, g);
    for (const side of [-1, 1]) {
      box(0.12, 1.16, 1.41, brass, side * 0.76, 0.65, 0, g);
    }
    const lid = new THREE.Group();
    lid.position.set(0, 1.2, -0.68);
    lid.rotation.x = -0.9;
    g.add(lid);
    box(2.1, 0.22, 1.4, wood, 0, 0.1, 0.7, lid);
    for (const side of [-1, 1])
      box(0.13, 0.26, 1.42, brass, side * 0.76, 0.1, 0.7, lid);
    box(0.28, 0.33, 0.12, brass, 0, 0.84, 0.72, g);
    blockers.push({ x, z, r: 1.3 });
  }
  for (let i = 0; i < 35; i++) {
    const a = random() * Math.PI * 2,
      r = 2 + random() * 9,
      x = Math.cos(a) * r,
      z = centerZ + Math.sin(a) * r;
    const y = r < radius ? height(r, a) + 0.24 : 0.25;
    const gem = add(
      new THREE.OctahedronGeometry(0.22 + random() * 0.18),
      new THREE.MeshStandardMaterial({
        color: ["#76e5e0", "#e395d6", "#90d598"][i % 3],
        metalness: 0.25,
        roughness: 0.18,
        emissive: "#315153",
        emissiveIntensity: 0.3,
      }),
      x,
      y,
      z,
    );
    gem.rotation.set(random(), random(), random());
  }
  const sparkleMaterial = new THREE.MeshBasicMaterial({ color: "#fff1b0" });
  for (let i = 0; i < 45; i++) {
    const a = random() * Math.PI * 2,
      r = random() * 8;
    const g = new THREE.Group();
    g.position.set(
      Math.cos(a) * r,
      height(Math.min(r, 7), a) + 0.4 + random(),
      centerZ + Math.sin(a) * r,
    );
    interior.add(g);
    box(0.035, 0.3, 0.035, sparkleMaterial, 0, 0, 0, g);
    box(0.2, 0.035, 0.035, sparkleMaterial, 0, 0, 0, g);
    sparkles.push(g);
  }
  const fill = new THREE.PointLight("#ffe7a1", 110, 32, 1.1);
  fill.position.set(0, 9, -4);
  interior.add(fill);
  torch(-12, 3, -6, interior);
  torch(12, 3, -6, interior);
  return {
    interior,
    entrance,
    blockers,
    coinCount: 2700,
    contains: (x, z) => Math.hypot(x, z) < 15.8,
    heightAt(x, z) {
      const r = Math.hypot(x, z - centerZ);
      if (r >= radius) return 0;
      // Use the same surface as the visible mound, including its gentle rim.
      return (
        height(r, Math.atan2(z - centerZ, x)) +
        0.08 * Math.min(1, (radius - r) / 0.5)
      );
    },
    isEntrance: (p) => Math.abs(p.x) < 2.2 && p.z < -41.2 && p.z > -45.5,
    isExit: (p) => Math.abs(p.x) < 2.3 && p.z > 12,
    constrain(p) {
      const length = Math.hypot(p.x, p.z);
      if (length > 16) {
        p.x *= 16 / length;
        p.z *= 16 / length;
      }
    },
    update(time, camera) {
      for (const g of walls)
        g.visible =
          g.position.x * camera.position.x + g.position.z * camera.position.z <
          100;
      sparkles.forEach((g, i) => {
        g.scale.setScalar(
          0.2 + Math.pow(Math.max(0, Math.sin(time * 2 + i * 2.3)), 8) * 1.2,
        );
        g.rotation.y = time * 0.4;
      });
      flames.forEach((l, i) => (l.intensity = 18 + Math.sin(time * 8 + i) * 2));
    },
  };
}
