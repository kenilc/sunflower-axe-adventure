import * as THREE from "three";
import { instantiateModel } from "../../assets/models.js";
import { createDioramaBase } from "../../rendering/diorama-base.js";
import { markGlow } from "../../rendering/glow.js";
import { createMeshFactory } from "../../rendering/mesh-factory.js";
import { createTreeVisibility } from "../../rendering/tree-visibility.js";
import { createRandom } from "../../systems/random.js";
import { createBalloonTrip } from "./balloon-trip.js";

// Mistwood Hollow: a misty forest at dusk on a round board. The balloon lands
// in a meadow to the south; a lantern path winds north through the trees to
// a clearing where five sleepy animal houses sit round a little pond.
// Little mist puffs drift in a glade beside the path.
export const MIST_SIZE = 38;
const EDGE = MIST_SIZE - 1.4;
const CLEARING = { x: 0, z: -14, r: 20 };
const FIELD = { x: 0, z: 30, r: 6.5 };
const POND = { x: 0, z: -14, r: 3.4 };
// The path winds between these depths, from the meadow to the clearing.
const PATH = { from: 4, to: 26, half: 1.5 };
export const pathX = (z) => 3.2 * Math.sin(z * 0.22);
const GLADE = { x: pathX(14) - 5, z: 14, r: 4 };
// The houses in assets/blender/build_mist_houses.py: how far each one's
// door stands in front of its centre, and its head's half-width, both at
// the model's own size. Built small, they stand twice as big in the
// hollow, so the friends fit through the doors and walk inside.
export const HOUSE_SCALE = 2;
const HOUSES = [
  { kind: "frog", angle: -1.6, front: 2.13, width: 2.8 },
  { kind: "cat", angle: -0.55, front: 1.96, width: 2.5 },
  { kind: "rabbit", angle: 0.55, front: 1.87, width: 2.3 },
  { kind: "owl", angle: 1.6, front: 1.75, width: 2.2 },
  // The turtle sits a little closer in, to the southeast, so its shell
  // stays clear of the trees and the path.
  { kind: "turtle", angle: 2.45, front: 2.98, width: 2.75, ring: 14 },
];
const HOUSE_RING = 15;
const LOG = new THREE.Vector3(-5, 0, -8);
const PINES = ["#3e6b6e", "#467a74", "#36605f", "#4d7f7c"];
const ROUNDS = ["#4c7a73", "#5a8578", "#456f6d"];

const inCircle = (x, z, c, margin = 0) =>
  Math.hypot(x - c.x, z - c.z) < c.r + margin;
function onPath(x, z, margin = 0) {
  if (z < PATH.from - margin || z > PATH.to + margin) return false;
  return Math.abs(x - pathX(z)) < PATH.half + margin;
}
export function walkable(x, z, margin = 0) {
  if (Math.hypot(x, z) > EDGE) return false;
  return (
    inCircle(x, z, CLEARING, margin) ||
    inCircle(x, z, FIELD, margin) ||
    inCircle(x, z, GLADE, margin) ||
    onPath(x, z, margin)
  );
}
// How far a tree stands from anywhere the friends can walk.
function clearance(x, z) {
  let gap = Infinity;
  for (const c of [CLEARING, FIELD, GLADE])
    gap = Math.min(gap, Math.hypot(x - c.x, z - c.z) - c.r);
  for (let t = PATH.from; t <= PATH.to; t += 0.5)
    gap = Math.min(gap, Math.hypot(x - pathX(t), z - t) - PATH.half);
  return gap;
}

export function createMistWorld(context) {
  const group = new THREE.Group();
  group.name = "mistwood-hollow";
  context.scene.add(group);
  const helpers = createMeshFactory(group);
  const { mesh, box, cyl, ball } = helpers;
  const rand = createRandom(3109);
  const blockers = [];
  const visibility = createTreeVisibility();
  const glowing = (color, intensity = 1.4) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.6,
    });
  const paper = glowing("#ffd99a");

  createDioramaBase({
    parent: group,
    mesh,
    size: MIST_SIZE,
    top: -0.03,
    grass: "#4f6a62",
    soil: "#3b2f2c",
    stone: "#6e7a78",
    rock: "#4a4f58",
    seed: 3109,
  });
  // Softer moss where the friends walk: the meadow, the glade and the clearing.
  for (const [c, color] of [
    [CLEARING, "#5d7d6e"],
    [FIELD, "#62806c"],
    [GLADE, "#5a7a6c"],
  ]) {
    const moss = cyl(c.r, c.r, 0.04, color, c.x, -0.005, c.z, group, 32);
    moss.castShadow = false;
  }

  // A pale stone path winding north between the trees.
  for (let z = PATH.to + 1; z > PATH.from - 1.2; z -= 0.95) {
    const slope = 3.2 * 0.22 * Math.cos(z * 0.22);
    const stone = box(2.5, 0.05, 0.9, "#a5a3b6", pathX(z), 0.03, z);
    stone.rotation.y = Math.atan(slope);
    stone.castShadow = false;
  }

  // Paper lanterns on crooked posts, every few steps along the path.
  const lanterns = [];
  function lantern(x, z, side, parent = group) {
    const post = new THREE.Group();
    post.position.set(x, 0, z);
    parent.add(post);
    cyl(0.07, 0.09, 3.2, "#5a4338", 0, 1.6, 0, post, 6);
    box(0.55, 0.08, 0.08, "#5a4338", -side * 0.24, 3.16, 0, post);
    const light = mesh(
      new THREE.IcosahedronGeometry(0.2, 2),
      paper,
      -side * 0.46,
      2.86,
      0,
      post,
    );
    light.scale.y = 1.2;
    light.castShadow = false;
    lanterns.push(light);
    blockers.push({ x, z, r: 0.25 });
    return post;
  }
  for (let z = PATH.to - 0.5, i = 0; z > PATH.from; z -= 2.6, i++) {
    const side = i % 2 ? 1 : -1;
    lantern(pathX(z) + side * 1.75, z, side);
  }

  // The meadow where the balloon comes down.
  const balloon = instantiateModel(context.models.balloon);
  balloon.position.set(-2.6, 0, FIELD.z + 1.6);
  group.add(balloon);
  const envelope = balloon.getObjectByName("envelope");
  for (const dx of [-2.3, 2.3])
    cyl(0.1, 0.12, 0.4, "#5a4338", -2.6 + dx, 0.2, FIELD.z + 1.6, group, 6);
  blockers.push({ x: -2.6, z: FIELD.z + 1.6, r: 1.3 });
  visibility.add(balloon, {
    meshes: (() => {
      const list = [];
      balloon.traverse((node) => node.isMesh && list.push(node));
      return list;
    })(),
    dynamic: true,
  });
  const trip = createBalloonTrip(context, { balloon, destination: "polder" });
  const balloonSpot = new THREE.Vector3(0, 0, FIELD.z + 0.6);

  // The forest: pines and round trees in misty teal, thick right up to the
  // paths. Trees near a path fade when they hide her; those deeper in, which
  // never come between her and the camera, share one instanced mesh.
  const cones = [],
    trunks = [];
  function tree(x, z) {
    const tall = 4.5 + rand() * 4;
    const pine = rand() < 0.62;
    const near = clearance(x, z) < 7;
    if (!near && pine) {
      trunks.push({ x, z, tall });
      for (let k = 0; k < 3; k++)
        cones.push({
          x,
          z,
          y: tall * (0.38 + k * 0.2),
          r: tall * (0.3 - k * 0.07),
          h: tall * 0.4,
          color: PINES[Math.floor(rand() * PINES.length)],
        });
      return;
    }
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);
    plant.rotation.y = rand() * Math.PI;
    group.add(plant);
    cyl(0.18, 0.26, tall * 0.5, "#4a3a3a", 0, tall * 0.25, 0, plant, 6);
    if (pine) {
      const color = PINES[Math.floor(rand() * PINES.length)];
      for (let k = 0; k < 3; k++)
        mesh(
          new THREE.ConeGeometry(tall * (0.3 - k * 0.07), tall * 0.4, 7),
          color,
          0,
          tall * (0.38 + k * 0.2),
          0,
          plant,
        );
    } else {
      const color = ROUNDS[Math.floor(rand() * ROUNDS.length)];
      for (let k = 0; k < 3; k++) {
        const crown = ball(
          tall * 0.24,
          color,
          Math.cos(k * 2.1) * tall * 0.12,
          tall * (0.58 + (k % 2) * 0.1),
          Math.sin(k * 2.1) * tall * 0.12,
          plant,
        );
        crown.scale.y = 0.8;
      }
    }
    visibility.add(plant);
  }
  for (let x = -MIST_SIZE; x <= MIST_SIZE; x += 2.9)
    for (let z = -MIST_SIZE; z <= MIST_SIZE; z += 2.9) {
      const px = x + (rand() - 0.5) * 2.2,
        pz = z + (rand() - 0.5) * 2.2;
      if (Math.hypot(px, pz) > EDGE - 0.8 || clearance(px, pz) < 1.1) continue;
      tree(px, pz);
    }
  const placed = new THREE.Object3D();
  const coneMesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 7),
    new THREE.MeshStandardMaterial({ roughness: 0.88, flatShading: true }),
    cones.length,
  );
  cones.forEach(({ x, z, y, r, h, color }, i) => {
    placed.position.set(x, y, z);
    placed.scale.set(r, h, r);
    placed.updateMatrix();
    coneMesh.setMatrixAt(i, placed.matrix);
    coneMesh.setColorAt(i, new THREE.Color(color));
  });
  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.18, 0.26, 1, 6),
    helpers.mat("#4a3a3a"),
    trunks.length,
  );
  trunks.forEach(({ x, z, tall }, i) => {
    placed.position.set(x, tall * 0.25, z);
    placed.scale.set(1, tall * 0.5, 1);
    placed.updateMatrix();
    trunkMesh.setMatrixAt(i, placed.matrix);
  });
  for (const forest of [coneMesh, trunkMesh]) {
    forest.name = "mist-forest";
    forest.castShadow = true;
    forest.receiveShadow = true;
    group.add(forest);
  }

  // The pond in the middle of the clearing, ringed with stones and lily pads.
  const water = cyl(
    POND.r,
    POND.r,
    0.04,
    new THREE.MeshStandardMaterial({
      color: "#5d78a3",
      roughness: 0.55,
    }),
    POND.x,
    0.03,
    POND.z,
    group,
    28,
  );
  water.castShadow = false;
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const rock = ball(
      0.32 + rand() * 0.16,
      i % 3 ? "#7d8582" : "#6d7a6c",
      POND.x + Math.cos(a) * (POND.r + 0.15),
      0.05,
      POND.z + Math.sin(a) * (POND.r + 0.15),
    );
    rock.scale.y = 0.5;
  }
  for (const [x, z] of [
    [-1.4, 0.8],
    [1.6, -1.1],
    [0.4, 1.8],
    [-0.8, -1.8],
  ].map(([dx, dz]) => [POND.x + dx, POND.z + dz])) {
    const pad = cyl(0.42, 0.42, 0.03, "#6f9a6a", x, 0.07, z, group, 10);
    pad.castShadow = false;
  }
  blockers.push({ x: POND.x, z: POND.z, r: POND.r + 0.35 });

  // Paper lanterns that float on the pond, one for each time they set one
  // down. They drift slowly round.
  const floating = Array.from({ length: 6 }, () => {
    const boat = new THREE.Group();
    boat.visible = false;
    group.add(boat);
    cyl(0.26, 0.2, 0.08, "#f2b6b8", 0, 0.06, 0, boat, 8);
    const light = mesh(
      new THREE.IcosahedronGeometry(0.16, 2),
      paper,
      0,
      0.24,
      0,
      boat,
    );
    light.castShadow = false;
    markGlow(light);
    return { boat, angle: 0, radius: 0, speed: 0 };
  });
  let afloat = 0;

  // The sleepy animal houses round the pond, facing it. Each door leads
  // inside. The head blocks the way except at its door: a circle set back
  // so its front stops just short of the doorway.
  const houses = HOUSES.map(
    ({ kind, angle, front, width, ring = HOUSE_RING }) => {
      const out = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle));
      const facing = out.clone().negate();
      const home = instantiateModel(
        context.models.mist_houses.getObjectByName(`${kind}-house`),
      );
      home.position.set(POND.x + out.x * ring, 0, POND.z + out.z * ring);
      home.rotation.y = Math.atan2(-out.x, -out.z);
      home.scale.setScalar(HOUSE_SCALE);
      group.add(home);
      markGlow(home.getObjectByName(`${kind}-house-glow`));
      const meshes = [];
      home.traverse((node) => node.isMesh && meshes.push(node));
      visibility.add(home, { meshes });
      const doorway = front * HOUSE_SCALE;
      const reach = width * HOUSE_SCALE * 0.9;
      const head = home.position
        .clone()
        .addScaledVector(facing, doorway - 0.3 - reach);
      blockers.push({ x: head.x, z: head.z, r: reach });
      // And a second circle for the back of the head (or the shell).
      const back = home.position
        .clone()
        .addScaledVector(facing, -width * HOUSE_SCALE * 0.5);
      blockers.push({ x: back.x, z: back.z, r: width * HOUSE_SCALE * 0.6 });
      const post = new THREE.Vector3(
        ...(kind === "turtle"
          ? [2.8, 0, 2.6]
          : [kind === "rabbit" || kind === "owl" ? -2.1 : 2.1, 0, 2]),
      )
        .multiplyScalar(HOUSE_SCALE)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), home.rotation.y);
      blockers.push({
        x: home.position.x + post.x,
        z: home.position.z + post.z,
        r: 0.35,
      });
      return {
        kind,
        home,
        facing,
        // Step onto this spot, at the door, to walk in.
        door: home.position.clone().addScaledVector(facing, doorway + 0.4),
        // Where they come back out, on the stepping stones.
        outside: home.position.clone().addScaledVector(facing, doorway + 2.6),
        visited: false,
        wiggle: 0,
      };
    },
  );

  // A mossy log by the pond, for sitting and watching the lanterns float.
  const log = new THREE.Group();
  log.position.copy(LOG);
  log.rotation.y = Math.atan2(POND.x - LOG.x, POND.z - LOG.z);
  group.add(log);
  const trunk = cyl(0.34, 0.36, 2.4, "#6b5244", 0, 0.34, -0.15, log, 10);
  trunk.rotation.z = Math.PI / 2;
  const moss = ball(0.36, "#7f9f72", 0.5, 0.62, -0.15, log);
  moss.scale.set(1.6, 0.4, 0.9);
  blockers.push({ x: LOG.x, z: LOG.z, r: 0.6 });
  const restSpot = LOG.clone().add(
    new THREE.Vector3(0, 0, 1.2).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      log.rotation.y,
    ),
  );

  // Mist puffs: soft round wisps with tiny faces. Most bob about the glade;
  // a few hover by the path and the clearing.
  const wispMaterial = new THREE.MeshStandardMaterial({
    color: "#f4f2ff",
    emissive: "#d9dcff",
    emissiveIntensity: 0.55,
    roughness: 0.9,
  });
  function wisp(x, y, z) {
    const puff = new THREE.Group();
    puff.position.set(x, y, z);
    group.add(puff);
    const body = mesh(
      new THREE.IcosahedronGeometry(0.3, 2),
      wispMaterial,
      0,
      0,
      0,
      puff,
    );
    body.castShadow = false;
    for (const side of [-1, 1]) {
      const eye = ball(0.055, "#3a2f36", side * 0.1, 0.04, 0.26, puff);
      eye.castShadow = false;
      const blush = ball(0.05, "#f5a6a8", side * 0.19, -0.05, 0.23, puff);
      blush.scale.set(1, 0.6, 0.4);
      blush.castShadow = false;
    }
    markGlow(body);
    return {
      puff,
      home: puff.position.clone(),
      phase: rand() * Math.PI * 2,
    };
  }
  const wisps = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    wisps.push(
      wisp(
        GLADE.x + Math.cos(a) * 2.2,
        1.2 + rand() * 0.8,
        GLADE.z + Math.sin(a) * 2.2,
      ),
    );
  }
  const strays = [
    [pathX(20) - 2.8, 1.6, 20],
    [pathX(8) + 2.6, 1.9, 8],
    [-11, 2.4, -4],
    [15, 2.4, 1],
    [5, 2.6, 27],
  ].map(([x, y, z]) => wisp(x, y, z));

  // Low mist lying over the ground, drifting slowly.
  const mistMaterial = new THREE.MeshBasicMaterial({
    color: "#e4e2f6",
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  });
  const banks = [];
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2,
      r = 4 + rand() * 28;
    const bank = mesh(
      new THREE.CircleGeometry(4 + rand() * 3, 16),
      mistMaterial,
      Math.cos(a) * r,
      0.5 + rand() * 1.4,
      Math.sin(a) * r,
    );
    bank.rotation.x = -Math.PI / 2;
    bank.castShadow = false;
    bank.receiveShadow = false;
    bank.renderOrder = 2;
    banks.push({ bank, home: bank.position.clone(), phase: rand() * 6 });
  }

  // Warm light pooling round the lanterns and the house doors.
  for (const [x, y, z, power] of [
    [0, 4, -10, 45],
    [pathX(15), 2.5, 15, 30],
    [0, 3, FIELD.z - 1, 26],
  ]) {
    const light = new THREE.PointLight("#ffcf8a", power, 16, 1.6);
    light.position.set(x, y, z);
    group.add(light);
  }
  for (const light of lanterns) markGlow(light);

  let gathering = 0,
    elapsed = 0;
  return {
    group,
    blockers,
    visibility,
    trip,
    balloon,
    balloonSpot,
    houses,
    wisps,
    floating,
    log,
    restSpot,
    pond: POND,
    glade: GLADE,
    clearing: CLEARING,
    contains: (x, z) => walkable(x, z),
    heightAt: () => 0,
    nearby(position) {
      const near = (spot, reach) =>
        Math.hypot(position.x - spot.x, position.z - spot.z) < reach;
      if (near(balloonSpot, 2.6)) return { kind: "balloon" };
      if (near(restSpot, 1.6)) return { kind: "rest" };
      if (near(POND, POND.r + 1.8)) return { kind: "pond" };
      if (near(GLADE, GLADE.r)) return { kind: "wisps" };
      return null;
    },
    get gathering() {
      return gathering > 0;
    },
    // The glade's wisps gather and circle round the friends for a while.
    gather(seconds = 5) {
      gathering = seconds;
    },
    // A happy wiggle as the friends come back out of a house.
    wave(house) {
      house.wiggle = 1.4;
    },
    // A lantern set down at the pond's edge nearest them drifts away.
    floatLantern(from) {
      const slot = floating[afloat % floating.length];
      afloat++;
      slot.angle = Math.atan2(from.z - POND.z, from.x - POND.x);
      slot.radius = POND.r - 0.5 - ((afloat - 1) % 3) * 0.7;
      slot.speed = 0.12 + rand() * 0.08;
      slot.boat.visible = true;
      return afloat;
    },
    reset() {
      gathering = 0;
      afloat = 0;
      for (const house of houses) {
        house.visited = false;
        house.wiggle = 0;
        house.home.scale.setScalar(HOUSE_SCALE);
      }
      for (const slot of floating) slot.boat.visible = false;
      for (const { puff, home } of wisps) puff.position.copy(home);
      trip.reset();
    },
    animate(dt) {
      elapsed += dt;
      gathering = Math.max(0, gathering - dt);
      envelope.rotation.z = Math.sin(elapsed * 0.5) * 0.03;
      envelope.position.y = Math.sin(elapsed * 0.7) * 0.08;
      const hero = context.hero.position;
      wisps.forEach(({ puff, home, phase }, i) => {
        const target = home.clone();
        if (gathering > 0) {
          const a = elapsed * 0.9 + (i / wisps.length) * Math.PI * 2;
          target.set(
            hero.x + Math.cos(a) * 1.8,
            1.6 + Math.sin(elapsed * 2 + i) * 0.3,
            hero.z + Math.sin(a) * 1.8,
          );
        }
        target.y += Math.sin(elapsed * 1.4 + phase) * 0.18;
        puff.position.lerp(target, 1 - Math.exp(-dt * 2.4));
        puff.rotation.y = Math.atan2(
          hero.x - puff.position.x,
          hero.z - puff.position.z,
        );
      });
      for (const { puff, home, phase } of strays) {
        puff.position.y = home.y + Math.sin(elapsed * 1.2 + phase) * 0.22;
        puff.rotation.y = Math.atan2(
          hero.x - puff.position.x,
          hero.z - puff.position.z,
        );
      }
      for (const house of houses) {
        house.wiggle = Math.max(0, house.wiggle - dt);
        const s = Math.sin(house.wiggle * 9) * house.wiggle * 0.05;
        house.home.scale.set(1 + s, 1 - s, 1 + s).multiplyScalar(HOUSE_SCALE);
      }
      for (const slot of floating) {
        if (!slot.boat.visible) continue;
        slot.angle += slot.speed * dt;
        slot.boat.position.set(
          POND.x + Math.cos(slot.angle) * slot.radius,
          Math.sin(elapsed * 1.5 + slot.angle) * 0.02,
          POND.z + Math.sin(slot.angle) * slot.radius,
        );
      }
      for (const { bank, home, phase } of banks)
        bank.position.set(
          home.x + Math.sin(elapsed * 0.08 + phase) * 2,
          home.y,
          home.z + Math.cos(elapsed * 0.06 + phase) * 1.5,
        );
    },
  };
}
