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
  returnGate.position.set(-16, 0, 14);
  group.add(returnGate);
  gate(returnGate);
  const center = (z) => Math.sin(z * 0.12) * 3;
  const inWater = (x, z, margin = 0) => Math.abs(x - center(z)) < 3.1 + margin;
  const onBridge = (x, z) => Math.abs(z) < 1.25 && Math.abs(x) < 6;
  const contains = (x, z) =>
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    (!inWater(x, z, 0.5) || onBridge(x, z));
  // The floor follows the player; its edges stay beyond the camera's far plane.
  const ground = box(440, 0.5, 440, "#79a56e", 0, -0.27, 0, group);
  for (let i = 0; i < 44; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (38 + (i % 4) * 2.4);
    const z = -34 + Math.floor(i / 2) * 3.3;
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
  // Leave the river ends open; large hills can swallow an orbiting camera.
  function ribbon(width, color, y, startZ, parent) {
    const vertices = [],
      indices = [];
    for (let i = 0; i <= 64; i++) {
      const z = startZ + i * 0.5;
      vertices.push(center(z) - width, y, z, center(z) + width, y, z);
      if (i < 64) {
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
    const surface = mesh(geo, material, 0, 0, 0, parent);
    surface.userData.ownedMaterial = true;
    surface.castShadow = false;
    return surface;
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
  const riverChunks = new Map(),
    meadowChunks = new Map();
  const chunkSize = 32,
    riverRadius = 6,
    meadowRadius = 3;
  function randomFor(x, z) {
    let seed = (Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ 9187) >>> 0;
    return () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  }
  function makeRiverChunk(index) {
    const chunk = new THREE.Group();
    chunk.name = "river-chunk";
    chunk.userData.index = index;
    group.add(chunk);
    const startZ = index * chunkSize;
    ribbon(6.9, "#cfc39b", 0.008, startZ, chunk);
    ribbon(4.2, "#ddcda3", 0.015, startZ, chunk);
    ribbon(3.1, "#52bbca", 0.04, startZ, chunk);
    const random = randomFor(0, index);
    for (let i = 0; i < 32; i++) {
      const z = startZ + i + 0.5;
      for (const side of [-1, 1]) {
        const stone = ball(
          0.14 + random() * 0.08,
          i % 2 ? "#96a6a0" : "#b7b9ac",
          center(z) + side * 3.5,
          0.12,
          z,
          chunk,
        );
        stone.scale.y = 0.5;
      }
    }
    const ripples = [];
    for (let i = 0; i < 12; i++) {
      const r = box(
        0.65 + random() * 0.3,
        0.012,
        0.035,
        "#b5ebe4",
        0,
        0.065,
        0,
        chunk,
      );
      r.castShadow = false;
      ripples.push({
        mesh: r,
        offset: random() * chunkSize,
        side: (random() - 0.5) * 4,
      });
    }
    const birds = [];
    if (index !== -1 && index !== 0) {
      for (let i = 0; i < 3; i++)
        birds.push({
          mesh: duck(chunk, i + 2),
          centerZ: startZ + 8 + i * 8,
          phase: random() * 6.28,
        });
    }
    return { group: chunk, ripples, birds, startZ };
  }
  function makeMeadowChunk(cx, cz) {
    const chunk = new THREE.Group();
    chunk.name = "meadow-chunk";
    group.add(chunk);
    const random = randomFor(cx, cz);
    // The original clearing already has flowers, treasure, and the gate.
    if ((cx === -1 || cx === 0) && (cz === -1 || cz === 0)) return chunk;
    for (let i = 0; i < 14; i++) {
      const x = (cx + random()) * chunkSize;
      const z = (cz + random()) * chunkSize;
      if (Math.abs(x - center(z)) < 8) continue;
      cyl(0.025, 0.045, 0.65, "#4e824d", x, 0.325, z, chunk);
      ball(0.14, ["#f5d47c", "#e6a6c7", "#b6bbef"][i % 3], x, 0.7, z, chunk);
      if (i % 5 === 0) {
        const stone = ball(0.3, "#96a6a0", x + 0.5, 0.12, z, chunk);
        stone.scale.y = 0.4;
      }
    }
    return chunk;
  }
  function disposeChunk(chunk) {
    group.remove(chunk);
    chunk.traverse((object) => {
      object.geometry?.dispose();
      if (object.userData.ownedMaterial) object.material.dispose();
    });
  }
  function ensureWorld(position) {
    ground.position.x = position.x;
    ground.position.z = position.z;
    const cx = Math.floor(position.x / chunkSize),
      cz = Math.floor(position.z / chunkSize);
    for (const [index, chunk] of riverChunks) {
      if (Math.abs(index - cz) > riverRadius || Math.abs(position.x) > 180) {
        disposeChunk(chunk.group);
        riverChunks.delete(index);
      }
    }
    if (Math.abs(position.x) <= 180) {
      for (let index = cz - riverRadius; index <= cz + riverRadius; index++) {
        if (!riverChunks.has(index))
          riverChunks.set(index, makeRiverChunk(index));
      }
    }
    for (const [key, chunk] of meadowChunks) {
      const [x, z] = key.split(",").map(Number);
      if (Math.abs(x - cx) > meadowRadius || Math.abs(z - cz) > meadowRadius) {
        disposeChunk(chunk);
        meadowChunks.delete(key);
      }
    }
    for (let x = cx - meadowRadius; x <= cx + meadowRadius; x++) {
      for (let z = cz - meadowRadius; z <= cz + meadowRadius; z++) {
        const key = `${x},${z}`;
        if (!meadowChunks.has(key))
          meadowChunks.set(key, makeMeadowChunk(x, z));
      }
    }
  }
  function animateDuck(bird, z, x, nextZ, nextX, time, phase) {
    bird.position.set(x, 0.04 + Math.sin(time * 2 + phase) * 0.015, z);
    bird.rotation.y = Math.atan2(nextX - x, nextZ - z);
  }
  ensureWorld(new THREE.Vector3(-16, 0, 10));
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
  for (let i = 0; i < 18; i++) {
    const [name, color, gem] = types[i % types.length];
    const z = -20 + Math.floor(i / 2) * 5;
    const x = center(z) + (i % 2 ? 1 : -1) * (5.3 + (i % 3) * 0.5);
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
    blockers,
    ensureWorld,
    updateVisibility: sceneryVisibility.update,
    contains,
    heightAt: (x, z) => (onBridge(x, z) ? 0.22 : 0),
    isEntrance: (p) => Math.abs(p.z) < 1.5 && p.x < -31.1 && p.x > -34,
    isExit: (p) => Math.abs(p.x + 16) < 1.5 && p.z > 13.3 && p.z < 16,
    reset() {
      treasures.forEach((t) => {
        t.got = false;
        t.crystal.visible = t.glow.visible = true;
      });
    },
    update(time, position) {
      if (position) ensureWorld(position);
      for (const chunk of riverChunks.values()) {
        chunk.ripples.forEach(({ mesh: r, offset, side }) => {
          r.position.z = chunk.startZ + ((offset + time * 0.6) % chunkSize);
          r.position.x = center(r.position.z) + side;
        });
        chunk.birds.forEach(({ mesh: bird, centerZ, phase }) => {
          const z = centerZ + Math.sin(time * 0.16 + phase) * 3;
          const x = center(z) + Math.sin(time * 0.23 + phase) * 1.6;
          const nextZ = centerZ + Math.sin((time + 0.05) * 0.16 + phase) * 3;
          const nextX =
            center(nextZ) + Math.sin((time + 0.05) * 0.23 + phase) * 1.6;
          animateDuck(bird, z, x, nextZ, nextX, time, phase);
        });
      }
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
