import * as THREE from "three";
import { createRandom } from "../../systems/random.js";

export function createShoreLife({ parent, helpers, actors, blockers }) {
  const { mesh, ball, cyl } = helpers;
  const random = createRandom(184);
  const pools = [],
    anemones = [],
    crabs = [],
    boats = [];
  let elapsed = 0;
  for (const [index, x, z] of [
    [0, -18, -11],
    [1, -25, -5],
  ]) {
    const group = new THREE.Group();
    group.name = `tide-pool-${index}`;
    group.position.set(x, 0, z);
    parent.add(group);
    const basin = cyl(2.3, 2.5, 0.1, "#728c85", 0, 0.05, 0, group, 32);
    basin.scale.z = 0.76;
    const water = mesh(
      new THREE.CircleGeometry(2.15, 40),
      new THREE.MeshStandardMaterial({
        color: "#70b8b0",
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
        metalness: 0.15,
        depthWrite: false,
      }),
      0,
      0.16,
      0,
      group,
    );
    water.rotation.x = -Math.PI / 2;
    water.scale.y = 0.76;
    for (let j = 0; j < 16; j++) {
      const angle = (j / 16) * Math.PI * 2;
      const rock = ball(
        0.32 + random() * 0.23,
        j % 3 ? "#88948e" : "#b0a999",
        Math.cos(angle) * 2.35,
        0.17,
        Math.sin(angle) * 1.8,
        group,
      );
      rock.scale.set(1.2, 0.8, 0.85);
      blockers.push({
        x: x + rock.position.x,
        z: z + rock.position.z,
        r: 0.35,
      });
    }
    blockers.push({ x, z, r: 1.8 });
    for (const [sx, sz, color] of [
      [-0.8, 0.1, "#ecaa82"],
      [0.8, 0.65, "#d9b2cc"],
    ]) {
      const shape = new THREE.Shape();
      for (let j = 0; j < 10; j++) {
        const angle = (j / 10) * Math.PI * 2;
        const r = j % 2 ? 0.17 : 0.48;
        const p = [Math.cos(angle) * r, Math.sin(angle) * r];
        if (j) shape.lineTo(...p);
        else shape.moveTo(...p);
      }
      shape.closePath();
      const star = mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.065, bevelEnabled: false }),
        color,
        sx,
        0.11,
        sz,
        group,
      );
      star.name = "tide-pool-starfish";
      star.rotation.x = -Math.PI / 2;
      for (let j = 0; j < 5; j++) {
        const angle = (j / 5) * Math.PI * 2;
        ball(
          0.025,
          "#fff0cf",
          sx + Math.cos(angle) * 0.28,
          0.18,
          sz - Math.sin(angle) * 0.28,
          group,
        );
      }
    }
    for (let j = 0; j < 3; j++) {
      const anemone = new THREE.Group();
      anemone.position.set(-0.7 + j * 0.65, 0.12, -0.7);
      anemone.name = "tide-pool-anemone";
      group.add(anemone);
      const color = j % 2 ? "#c7a3c6" : "#dea18f";
      cyl(0.12, 0.2, 0.15, color, 0, 0.05, 0, anemone);
      const tentacles = [];
      for (let k = 0; k < 9; k++) {
        const angle = (k / 9) * Math.PI * 2;
        const pivot = new THREE.Group();
        pivot.position.set(Math.cos(angle) * 0.1, 0.1, Math.sin(angle) * 0.1);
        anemone.add(pivot);
        cyl(0.02, 0.035, 0.28, color, 0, 0.14, 0, pivot, 5);
        ball(0.04, "#f4d4cb", 0, 0.29, 0, pivot);
        tentacles.push(pivot);
      }
      anemones.push(tentacles);
    }
    const ripple = mesh(
      new THREE.RingGeometry(0.7, 0.72, 40),
      new THREE.MeshBasicMaterial({
        color: "#d8eee0",
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
      0.2,
      0.18,
      0,
      group,
    );
    ripple.rotation.x = -Math.PI / 2;
    pools.push({
      group,
      water,
      ripple,
      nearby: (p) => Math.hypot(p.x - x, p.z - z) < 4.3,
      description: index
        ? "Tiny anemones wave their tentacles. A lilac starfish rests beneath the clear water."
        : "A peach starfish rests among the rocks. Little crabs dart past swaying anemones.",
    });
  }
  for (let i = 0; i < 8; i++) {
    const crab = new THREE.Group();
    crab.name = "shore-crab";
    parent.add(crab);
    const body = ball(0.17, "#c47d63", 0, 0.14, 0, crab);
    body.scale.set(1.4, 0.55, 1);
    const legs = [];
    for (const side of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const leg = cyl(
          0.014,
          0.02,
          0.24,
          "#b37059",
          side * 0.2,
          0.075,
          (j - 1) * 0.11,
          crab,
          4,
        );
        leg.rotation.z = side * 1.1;
        legs.push(leg);
      }
      const claw = ball(0.08, "#d49170", side * 0.29, 0.15, 0.22, crab);
      claw.scale.set(0.7, 1, 1.3);
      cyl(0.014, 0.02, 0.1, "#b37059", side * 0.07, 0.2, 0.12, crab, 4);
      ball(0.027, "#344643", side * 0.07, 0.26, 0.12, crab);
    }
    const x = i < 6 ? -26 + i * 10 : pools[i - 6].group.position.x + 0.5;
    const z =
      i < 6 ? -16.8 + (i % 2) * 1.6 : pools[i - 6].group.position.z - 0.1;
    const y = i < 6 ? 0 : 0.11;
    crab.position.set(x, y, z);
    crabs.push({
      group: crab,
      legs,
      x,
      z,
      y,
      phase: random() * 20,
      target: crab.position.clone(),
      wait: 0.5 + random() * 3,
      radius: i < 6 ? 0.9 : 0.45,
    });
  }
  for (let i = 0; i < 18; i++) {
    const weed = new THREE.Group();
    weed.name = "washed-up-seaweed";
    weed.position.set(-28 + random() * 56, 0.035, -17 + random() * 4);
    weed.rotation.y = random() * Math.PI * 2;
    parent.add(weed);
    for (let j = 0; j < 5; j++) {
      const leaf = ball(
        0.16,
        j % 2 ? "#8c9470" : "#72866b",
        (j - 2) * 0.14,
        0,
        Math.sin(j) * 0.12,
        weed,
      );
      leaf.scale.set(0.45, 0.15, 2.5);
      leaf.rotation.y = j * 0.7;
    }
  }
  for (const [x, z, length, angle] of [
    [-11, -15, 2.4, 0.35],
    [22, 5, 3.3, -0.7],
    [-22, 17, 2.7, 1.1],
  ]) {
    const log = new THREE.Group();
    log.name = "weathered-driftwood";
    log.position.set(x, 0.12, z);
    log.rotation.y = angle;
    parent.add(log);
    const trunk = cyl(0.11, 0.18, length, "#b49a7e", 0, 0, 0, log);
    trunk.rotation.z = Math.PI / 2;
    const branch = cyl(0.035, 0.08, 0.9, "#b49a7e", 0.4, 0.06, 0.3, log, 5);
    branch.rotation.x = Math.PI / 2;
    branch.rotation.z = 0.35;
    blockers.push({ x, z, r: length * 0.42 });
  }
  for (const [i, x, z] of [
    [0, -48, -85],
    [1, 37, -110],
    [2, 68, -70],
  ]) {
    const boat = new THREE.Group();
    boat.name = "offshore-sailboat";
    boat.position.set(x, 0, z);
    boat.rotation.y = -0.4 + i * 0.65;
    parent.add(boat);
    const hull = ball(1.3, i % 2 ? "#668b95" : "#a78172", 0, 0.25, 0, boat);
    hull.scale.set(0.75, 0.32, 2.2);
    cyl(0.045, 0.07, 5.2, "#a89175", 0, 2.8, 0, boat);
    const shape = new THREE.Shape();
    shape.moveTo(0.12, 1);
    shape.lineTo(0.12, 5.3);
    shape.lineTo(2.1, 1);
    shape.closePath();
    mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({
        color: "#f4ddbb",
        side: THREE.DoubleSide,
      }),
      0,
      0,
      0,
      boat,
    );
    boats.push(boat);
  }
  // A fixed pool of footprints avoids accumulating meshes during long walks.
  const footprintGeometry = new THREE.CircleGeometry(1, 12);
  footprintGeometry.rotateX(-Math.PI / 2);
  const footprints = new THREE.InstancedMesh(
    footprintGeometry,
    new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
    120,
  );
  footprints.name = "fading-beach-footprints";
  footprints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  footprints.frustumCulled = false;
  parent.add(footprints);
  const marks = Array.from({ length: 120 }, () => ({
    age: 40,
    x: 0,
    z: 0,
    yaw: 0,
  }));
  const tracks = actors.map((actor) => ({
    actor,
    last: actor.position.clone(),
    side: 1,
  }));
  const dummy = new THREE.Object3D(),
    sandColor = new THREE.Color("#e6c296"),
    printColor = new THREE.Color("#ad8b68");
  let cursor = 0;
  function renderFootprints(dt) {
    for (const track of tracks) {
      const { actor, last } = track;
      const distance = Math.hypot(
        actor.position.x - last.x,
        actor.position.z - last.z,
      );
      if (distance > 3 || actor.position.y < -0.1) {
        last.copy(actor.position);
        continue;
      }
      if (distance < 0.65 || !dt) continue;
      const yaw = Math.atan2(
        actor.position.x - last.x,
        actor.position.z - last.z,
      );
      track.side *= -1;
      marks[cursor] = {
        age: 0,
        x: actor.position.x + Math.cos(yaw) * 0.18 * track.side,
        z: actor.position.z - Math.sin(yaw) * 0.18 * track.side,
        yaw,
      };
      cursor = (cursor + 1) % marks.length;
      last.copy(actor.position);
    }
    marks.forEach((mark, i) => {
      mark.age += dt;
      dummy.position.set(mark.x, 0.014, mark.z);
      dummy.rotation.set(0, mark.yaw, 0);
      dummy.scale.set(mark.age < 30 ? 0.12 : 0, 1, mark.age < 30 ? 0.25 : 0);
      dummy.updateMatrix();
      footprints.setMatrixAt(i, dummy.matrix);
      footprints.setColorAt(
        i,
        printColor.clone().lerp(sandColor, Math.min(1, mark.age / 30)),
      );
    });
    footprints.instanceMatrix.needsUpdate = true;
    footprints.instanceColor.needsUpdate = true;
  }
  renderFootprints(0);
  return {
    pools,
    crabs,
    boats,
    footprints,
    nearestPool: (position) => pools.find((pool) => pool.nearby(position)),
    resetTracks() {
      tracks.forEach((track) => track.last.copy(track.actor.position));
    },
    update(dt) {
      elapsed += dt;
      pools.forEach(({ water, ripple }, i) => {
        water.material.opacity = 0.62 + Math.sin(elapsed * 0.7 + i) * 0.04;
        const phase = (elapsed * 0.19 + i * 0.4) % 1;
        ripple.scale.setScalar(0.4 + phase * 1.6);
        ripple.material.opacity = Math.sin(phase * Math.PI) * 0.22;
      });
      anemones.forEach((tentacles, i) =>
        tentacles.forEach((pivot, j) => {
          pivot.rotation.x = Math.sin(elapsed * 0.9 + i + j * 0.6) * 0.22;
          pivot.rotation.z = Math.cos(elapsed * 0.7 + j) * 0.25;
        }),
      );
      crabs.forEach((crab) => {
        const { group, legs, x, z, y, phase, target, radius } = crab;
        const distance = group.position.distanceTo(target);
        const moving = distance > 0.04;
        if (moving)
          group.position.lerp(target, Math.min(1, (dt * 1.2) / distance));
        else {
          crab.wait -= dt;
          if (crab.wait <= 0) {
            target.set(
              x + (random() * 2 - 1) * radius,
              y,
              z + (random() * 2 - 1) * radius * 0.4,
            );
            crab.wait = 1 + random() * 4;
          }
        }
        legs.forEach(
          (leg, j) =>
            (leg.rotation.x = moving
              ? Math.sin((elapsed + phase) * 15 + j * 2) * 0.3
              : 0),
        );
      });
      boats.forEach((boat, i) => {
        boat.position.y = Math.sin(elapsed * (0.6 + i * 0.09) + i) * 0.12;
        boat.rotation.z = Math.sin(elapsed * 0.47 + i * 2) * 0.05;
      });
      renderFootprints(dt);
    },
  };
}
