import * as THREE from "./vendor/three.module.js";

const lakeX = 11,
  lakeZ = 14;
export const inLake = (x, z, margin = 0) =>
  Math.hypot((x - lakeX) / (5.7 + margin), (z - lakeZ) / (4 + margin)) < 1;
export const reservedLakeside = (x, z) =>
  inLake(x, z, 1) || Math.hypot(x - 6.4, z - 9.6) < 2.4;

export function createLakeside({ mesh, box, cyl, ball }) {
  const group = new THREE.Group();
  const bank = cyl(1, 1, 0.09, "#c8bd89", lakeX, 0.04, lakeZ, group, 64);
  bank.scale.set(6.35, 1, 4.65);
  const water = mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshStandardMaterial({
      color: "#62b8b7",
      roughness: 0.24,
      metalness: 0.28,
      transparent: true,
      opacity: 0.93,
    }),
    lakeX,
    0.095,
    lakeZ,
    group,
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.set(5.7, 4, 1);
  water.castShadow = false;
  const ripples = [];
  for (let i = 0; i < 7; i++) {
    const ripple = mesh(
      new THREE.TorusGeometry(0.45 + i * 0.09, 0.014, 4, 32),
      new THREE.MeshBasicMaterial({
        color: "#c5eece",
        transparent: true,
        opacity: 0.4,
      }),
      lakeX + Math.sin(i * 2.4) * 3.4,
      0.105,
      lakeZ + Math.cos(i * 2.4) * 2.1,
      group,
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.scale.y = 0.65;
    ripples.push(ripple);
  }
  for (let i = 0; i < 6; i++) {
    const angle = i * 1.7;
    const x = lakeX + Math.cos(angle) * 4,
      z = lakeZ + Math.sin(angle) * 2.7;
    const lily = cyl(0.28, 0.28, 0.025, "#54894b", x, 0.12, z, group, 10);
    lily.scale.z = 0.8;
    if (i % 2 === 0) {
      for (let petal = 0; petal < 5; petal++) {
        const a = (petal * Math.PI * 2) / 5;
        const flower = ball(
          0.1,
          "#ffe9c6",
          x + Math.cos(a) * 0.09,
          0.18,
          z + Math.sin(a) * 0.09,
          group,
        );
        flower.scale.y = 0.45;
      }
      ball(0.055, "#edbb36", x, 0.22, z, group);
    }
  }
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI * 2) / 18;
    const x = lakeX + Math.cos(a) * 6.1,
      z = lakeZ + Math.sin(a) * 4.4;
    // Leave the bench's view and approach open.
    if (Math.hypot(x - 6.4, z - 9.6) < 3.2) continue;
    for (let j = 0; j < 3; j++) {
      cyl(
        0.022,
        0.03,
        0.8 + j * 0.2,
        "#64804b",
        x + j * 0.1,
        0.4 + j * 0.1,
        z,
        group,
      );
      cyl(0.055, 0.055, 0.22, "#86603d", x + j * 0.1, 0.85 + j * 0.2, z, group);
    }
  }
  const bench = new THREE.Group();
  bench.position.set(6.4, 0, 9.6);
  bench.rotation.y = 0.85;
  group.add(bench);
  for (const side of [-1, 1]) {
    box(0.15, 0.83, 0.72, "#344b43", side * 1.25, 0.42, 0, bench);
    box(0.12, 1.25, 0.12, "#344b43", side * 1.25, 1.05, -0.38, bench);
    box(0.16, 0.12, 0.8, "#a87746", side * 1.42, 1.22, 0, bench);
  }
  for (let i = 0; i < 3; i++) {
    box(3.2, 0.13, 0.23, "#bd8b54", 0, 0.83, -0.26 + i * 0.26, bench);
    box(
      3.2,
      0.2,
      0.12,
      i % 2 ? "#b07e48" : "#bd8b54",
      0,
      1.13 + i * 0.24,
      -0.4,
      bench,
    );
  }
  // A short sandy approach connects the clearing to the seat.
  const approach = box(2.8, 0.035, 4.6, "#b8ac73", 4.5, 0.03, 7.6, group);
  approach.rotation.y = 0.85;
  return {
    group,
    bench,
    update(time) {
      ripples.forEach((r, i) => {
        const phase = (time * 0.18 + i / 7) % 1;
        r.scale.set(0.6 + phase * 1.2, (0.6 + phase * 1.2) * 0.65, 1);
        r.material.opacity = Math.sin(phase * Math.PI) * 0.35;
      });
    },
  };
}

export function createBenchMoment({
  bench,
  hero,
  heroRig,
  companion,
  hearts,
  toast,
}) {
  let seated = false,
    elapsed = 0,
    emitted = false;
  const start = [],
    startYaw = [],
    seatSides = [-1, 1];
  const rigs = [heroRig, companion.rig];
  const characters = [hero, companion.character];
  function nearby() {
    return (
      Math.hypot(
        hero.position.x - bench.position.x,
        hero.position.z - bench.position.z,
      ) < 3.8
    );
  }
  function pose(rig, side, hug) {
    rig.body.position.y = 0;
    rig.body.rotation.z = -side * hug * 0.1;
    rig.legs.forEach((leg) => {
      leg.rotation.x = -1.3;
      leg.children[1].rotation.x = 1.3;
    });
    rig.arms.forEach((arm, i) => {
      const inner = (side < 0 && i === 1) || (side > 0 && i === 0);
      arm.rotation.x = inner ? -0.5 * hug : -0.9;
      arm.rotation.z = inner ? -side * hug * 1.2 : 0;
    });
    if (rig.held) rig.held.visible = false;
  }
  function sit() {
    if (seated || !nearby()) return false;
    seated = true;
    elapsed = 0;
    emitted = false;
    characters.forEach((c, i) => {
      start[i] = c.position.clone();
      startYaw[i] = c.rotation.y;
    });
    const across = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      bench.rotation.y,
    );
    seatSides[0] = start[0].clone().sub(start[1]).dot(across) <= 0 ? -1 : 1;
    seatSides[1] = -seatSides[0];
    hearts.clear();
    toast("A quiet moment by the lake ♥ · B or Stand up to leave");
    return true;
  }
  function stand() {
    if (!seated) return;
    seated = false;
    rigs.forEach((rig) => {
      rig.body.rotation.z = rig.body.position.y = 0;
      [...rig.legs, ...rig.arms].forEach((limb) => limb.rotation.set(0, 0, 0));
      rig.legs.forEach((leg) => {
        leg.children[1].rotation.x = 0;
      });
      if (rig.held) rig.held.visible = true;
    });
    const exit = new THREE.Vector3(0, 0, -2.8)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), bench.rotation.y)
      .add(bench.position);
    hero.position.copy(exit);
    companion.reset(exit);
    toast("Back to wandering together");
  }
  function update(dt) {
    if (!seated) return;
    elapsed += dt;
    const progress = THREE.MathUtils.smoothstep(elapsed, 0, 0.75);
    const hug = THREE.MathUtils.smoothstep(elapsed, 0.7, 1.5);
    characters.forEach((c, i) => {
      const target = new THREE.Vector3(seatSides[i] * 0.64, 0.3, 0.04)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), bench.rotation.y)
        .add(bench.position);
      c.position.lerpVectors(start[i], target, progress);
      const turn = Math.atan2(
        Math.sin(bench.rotation.y - startYaw[i]),
        Math.cos(bench.rotation.y - startYaw[i]),
      );
      c.rotation.y = startYaw[i] + turn * progress;
      pose(rigs[i], seatSides[i], hug);
    });
    // Keep the approach clear even when both arrive from the same end.
    const separation = characters[0].position
      .clone()
      .sub(characters[1].position);
    separation.y = 0;
    const distance = separation.length();
    if (distance < 1.2) {
      if (distance < 1e-9)
        separation
          .set(seatSides[0], 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), bench.rotation.y);
      else separation.divideScalar(distance);
      separation.multiplyScalar((1.2 - distance) / 2);
      characters[0].position.add(separation);
      characters[1].position.sub(separation);
    }
    if (elapsed > 1.5 && !emitted) {
      emitted = true;
      hearts.contact(true, hero.position, companion.character.position);
    }
  }
  return {
    nearby,
    sit,
    stand,
    update,
    get seated() {
      return seated;
    },
  };
}
