import * as THREE from "three";

export function createBoatTrip({
  mesh,
  box,
  cyl,
  ball,
  scene,
  riverside,
  hero,
  heroRig,
  companion,
  toast,
  onSceneChange,
}) {
  const lagoonGroup = new THREE.Group();
  lagoonGroup.visible = false;
  scene.add(lagoonGroup);
  const lagoon = {
    group: lagoonGroup,
    blockers: [{ x: 0, z: 0, r: 1 }],
    contains(x, z) {
      const r = Math.hypot(x, z);
      return (
        r < 24 &&
        !(Math.abs(x) < 3.8 && z < -17.5) &&
        (r > 17.9 || r < 5.7 || (Math.abs(x) < 1.45 && z > 4 && z < 21))
      );
    },
    heightAt: (x, z) => (Math.abs(x) < 1.5 && z > 5.5 && z < 19 ? 0.16 : 0),
  };
  cyl(25, 25, 3, "#71976e", 0, -1.53, 0, lagoonGroup, 96);
  const pool = mesh(
    new THREE.CircleGeometry(17.5, 80),
    new THREE.MeshStandardMaterial({
      color: "#64c4cb",
      roughness: 0.22,
      metalness: 0.2,
    }),
    0,
    0.025,
    0,
    lagoonGroup,
  );
  pool.rotation.x = -Math.PI / 2;
  pool.castShadow = false;
  cyl(6, 6, 0.1, "#a5bc78", 0, 0, 0, lagoonGroup, 48);
  for (let i = 0; i < 32; i++)
    box(
      2.8,
      0.14,
      0.4,
      i % 2 ? "#c8a77e" : "#d6b88b",
      0,
      0.08,
      5.5 + i * 0.42,
      lagoonGroup,
    );
  // Thousands of petals share a handful of draw calls.
  let flowerSeed = 24318;
  const random = () =>
    (flowerSeed = (Math.imul(flowerSeed, 1664525) + 1013904223) >>> 0) /
    4294967296;
  const flowerPositions = [];
  function clearApproach(x, z) {
    return (
      (Math.abs(x) < 4.6 && z < -17.5) ||
      (Math.abs(x) < 1.8 && (z > 3 || (z < -1.4 && z > -5.7))) ||
      Math.hypot(x - 5, z - 20) < 2.4
    );
  }
  while (flowerPositions.length < 900) {
    const inner = flowerPositions.length >= 740;
    const angle = random() * Math.PI * 2;
    const r = inner ? 1.8 + random() * 3.5 : 18.4 + random() * 5.8;
    const x = Math.cos(angle) * r,
      z = Math.sin(angle) * r;
    if (clearApproach(x, z) || (!inner && r > 20.5 && r < 21.8)) continue;
    flowerPositions.push({
      x,
      z,
      height: 0.65 + random() * 0.5,
      yaw: random() * Math.PI * 2,
    });
  }
  const instance = (name, geometry, color, count) => {
    const flowers = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        flatShading: true,
      }),
      count,
    );
    flowers.name = name;
    flowers.receiveShadow = true;
    lagoonGroup.add(flowers);
    return flowers;
  };
  const stems = instance(
    "sunflower-stems",
    new THREE.CylinderGeometry(0.025, 0.035, 1, 5),
    "#568646",
    900,
  );
  const leaves = instance(
    "sunflower-leaves",
    new THREE.IcosahedronGeometry(1, 0),
    "#72994e",
    1800,
  );
  const petals = instance(
    "sunflower-petals",
    new THREE.IcosahedronGeometry(1, 1),
    "#ffd254",
    7200,
  );
  const centers = instance(
    "sunflower-centers",
    new THREE.IcosahedronGeometry(1, 1),
    "#765133",
    900,
  );
  const dummy = new THREE.Object3D();
  function setInstance(
    batch,
    index,
    x,
    y,
    z,
    sx,
    sy,
    sz,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(rx, ry, rz);
    dummy.updateMatrix();
    batch.setMatrixAt(index, dummy.matrix);
  }
  flowerPositions.forEach(({ x, z, height: h, yaw }, i) => {
    setInstance(stems, i, x, h / 2, z, 1, h, 1);
    for (const side of [-1, 1])
      setInstance(
        leaves,
        i * 2 + (side > 0 ? 1 : 0),
        x + side * 0.12,
        h * 0.48,
        z,
        0.22,
        0.07,
        0.1,
        0,
        yaw,
        side * 0.4,
      );
    setInstance(centers, i, x, h, z, 0.16, 0.16, 0.08, 0, yaw);
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      setInstance(
        petals,
        i * 8 + j,
        x + Math.cos(a) * 0.25 * Math.cos(yaw),
        h + Math.sin(a) * 0.25,
        z - Math.cos(a) * 0.25 * Math.sin(yaw),
        0.12,
        0.23,
        0.06,
        0,
        yaw,
        a - Math.PI / 2,
      );
    }
  });
  lagoon.sunflowerCount = flowerPositions.length;
  const gemColors = [
    "#f26f96",
    "#62d9be",
    "#779bee",
    "#be8eef",
    "#f3bd62",
    "#8be4ed",
  ];
  const gems = instance(
    "lagoon-gems",
    new THREE.OctahedronGeometry(1),
    "#ffffff",
    180,
  );
  const stones = instance(
    "lagoon-polished-stones",
    new THREE.IcosahedronGeometry(1, 1),
    "#ffffff",
    60,
  );
  gems.material.roughness = 0.22;
  gems.material.metalness = 0.25;
  stones.material.roughness = 0.4;
  const treasures = [];
  let found = 0;
  for (let i = 0; i < 240; i++) {
    let x, z;
    do {
      const angle = random() * Math.PI * 2;
      const r = i < 190 ? 18.6 + random() * 4.8 : 1.8 + random() * 3.5;
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
    } while (clearApproach(x, z));
    const polished = i % 4 === 0,
      batch = polished ? stones : gems,
      index = polished ? Math.floor(i / 4) : i - Math.floor(i / 4) - 1,
      color = gemColors[i % 6];
    const size = 0.18 + random() * 0.18;
    setInstance(
      batch,
      index,
      x,
      polished ? 0.17 : 0.3,
      z,
      size * (polished ? 1.4 : 1),
      size * (polished ? 0.6 : 1.35),
      size,
      0,
      random() * 6.28,
      0,
    );
    batch.setColorAt(index, new THREE.Color(color));
    const matrix = new THREE.Matrix4();
    batch.getMatrixAt(index, matrix);
    treasures.push({
      matrix,
      position: new THREE.Vector3(x, 0.25, z),
      batch,
      index,
      color,
      got: false,
    });
  }
  lagoon.treasures = treasures;
  Object.defineProperty(lagoon, "collected", { get: () => found });
  lagoon.collect = (position) => {
    let count = 0,
      last = null;
    for (const t of treasures)
      if (
        !t.got &&
        Math.hypot(position.x - t.position.x, position.z - t.position.z) < 1.05
      ) {
        t.got = true;
        found++;
        count++;
        last = t;
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        t.batch.setMatrixAt(t.index, dummy.matrix);
        t.batch.instanceMatrix.needsUpdate = true;
      }
    return count
      ? {
          count,
          total: found,
          color: last.color,
          position: last.position.clone(),
        }
      : null;
  };
  lagoon.resetTreasures = () => {
    found = 0;
    for (const t of treasures) {
      t.got = false;
      t.batch.setMatrixAt(t.index, t.matrix);
    }
    gems.instanceMatrix.needsUpdate = stones.instanceMatrix.needsUpdate = true;
  };
  for (let i = 0; i < 36; i++) {
    const a = i * 2.4,
      r = 8 + (i % 6) * 1.35;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (Math.abs(x) < 2 && z > 0) continue;
    cyl(0.45, 0.45, 0.025, "#558e65", x, 0.065, z, lagoonGroup, 10);
    if (i % 3 === 0) {
      const blossom = ball(0.23, "#fac5df", x, 0.2, z, lagoonGroup);
      blossom.scale.y = 0.55;
    }
  }
  cyl(0.9, 1.1, 0.6, "#e2d7b0", 0, 0.3, 0, lagoonGroup, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const petal = ball(
      0.65,
      "#f4bfdd",
      Math.cos(a) * 0.55,
      1,
      Math.sin(a) * 0.55,
      lagoonGroup,
    );
    petal.scale.set(0.65, 0.45, 1.3);
    petal.rotation.y = -a;
  }
  ball(0.3, "#ffe59a", 0, 1.22, 0, lagoonGroup);
  const riverDock = new THREE.Vector3(Math.sin(-12 * 0.12) * 3 + 5.4, 0, -12);
  const lagoonDock = new THREE.Vector3(5, 0, 20);
  for (let i = 0; i < 8; i++)
    box(2.4, 0.12, 0.4, "#cba779", 5, 0.08, 17.8 + i * 0.4, lagoonGroup);
  for (let i = 0; i < 7; i++)
    box(
      0.4,
      0.12,
      2.2,
      "#cba779",
      riverDock.x - 1 + i * 0.4,
      0.05,
      -12,
      riverside.group,
    );
  const boat = new THREE.Group();
  boat.name = "travelling-rowboat";
  scene.add(boat);
  const hull = mesh(
    new THREE.SphereGeometry(
      1,
      16,
      8,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    new THREE.MeshStandardMaterial({
      color: "#976940",
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
    0,
    0.68,
    0,
    boat,
  );
  hull.scale.set(1.25, 0.65, 2.4);
  for (const x of [-1.15, 1.15])
    box(0.12, 0.16, 3.7, "#e4bb7b", x, 0.68, 0, boat);
  for (const z of [-0.9, 0, 0.9])
    box(2.1, 0.15, 0.4, "#d7ad73", 0, 0.55, z, boat);
  const oars = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.1, 0.6, 0);
    boat.add(pivot);
    const shaft = box(2.5, 0.075, 0.075, "#b48756", side * 0.95, 0, 0, pivot);
    box(0.6, 0.09, 0.25, "#d5aa70", side * 2.05, 0, 0, pivot);
    oars.push(pivot);
  }
  let atLagoon = false,
    rowing = false,
    elapsed = 0,
    switched = false,
    enabled = false;
  const rigs = [heroRig, companion.rig],
    characters = [hero, companion.character];
  function idleBoat() {
    boat.position.set(
      atLagoon ? 5 : Math.sin(-12 * 0.12) * 3,
      0,
      atLagoon ? 16 : -12,
    );
    boat.rotation.y = 0;
  }
  idleBoat();
  boat.visible = false;
  function nearby() {
    const dock = atLagoon ? lagoonDock : riverDock;
    return (
      enabled &&
      !rowing &&
      Math.hypot(hero.position.x - dock.x, hero.position.z - dock.z) < 3.3
    );
  }
  function restorePose() {
    rigs.forEach((r) => {
      r.body.position.y = 0;
      r.body.rotation.set(0, 0, 0);
      [...r.arms, ...r.legs].forEach((l) => l.rotation.set(0, 0, 0));
      r.feet.forEach((foot) => {
        foot.rotation.x = 0;
      });
      if (r.held) r.held.visible = true;
    });
  }
  function seat(time) {
    characters.forEach((c, i) => {
      c.position.copy(
        new THREE.Vector3(i ? 0.48 : -0.48, -0.05, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), boat.rotation.y)
          .add(boat.position),
      );
      c.rotation.y = boat.rotation.y;
      const r = rigs[i];
      r.body.position.y = 0;
      r.legs.forEach((leg) => {
        leg.rotation.x = -1.25;
      });
      r.feet.forEach((foot) => {
        foot.rotation.x = 1.25;
      });
      r.arms.forEach((a, j) => {
        a.rotation.x = -0.65 + Math.sin(time * 4) * 0.35;
        a.rotation.z = (j ? 1 : -1) * 0.2;
      });
      if (r.held) r.held.visible = false;
    });
    oars.forEach((o, i) => {
      o.rotation.y = Math.sin(time * 4) * (i ? 1 : -1) * 0.5;
      o.rotation.z = Math.cos(time * 4) * (i ? 1 : -1) * 0.12;
    });
  }
  function start() {
    if (!nearby()) return false;
    rowing = true;
    elapsed = 0;
    switched = false;
    toast(
      atLagoon
        ? "Rowing back together to Rainbow Riverside"
        : "All aboard! Rowing together to the Lotus Lagoon",
    );
    return true;
  }
  function update(dt) {
    if (!rowing) return;
    elapsed += dt;
    if (!switched && elapsed >= 5) {
      atLagoon = !atLagoon;
      switched = true;
      lagoonGroup.visible = atLagoon;
      riverside.group.visible = !atLagoon;
      lagoonGroup.add(companion.character);
      if (!atLagoon) riverside.group.add(companion.character);
    }
    let z;
    if (!switched) z = atLagoon ? 16 - elapsed * 1.6 : -12 - elapsed * 5;
    else
      z = atLagoon
        ? 8 + Math.min(1, (elapsed - 5) / 4) * 8
        : -37 + Math.min(1, (elapsed - 5) / 4) * 25;
    boat.position.set(
      atLagoon ? 5 : Math.sin(z * 0.12) * 3,
      Math.sin(elapsed * 3) * 0.025,
      z,
    );
    const direction = switched ? 1 : -1;
    boat.rotation.y = Math.atan2(
      atLagoon ? 0 : direction * 0.36 * Math.cos(z * 0.12),
      direction,
    );
    seat(elapsed);
    if (switched && elapsed - dt < 5) onSceneChange(atLagoon);
    if (elapsed >= 9) {
      rowing = false;
      restorePose();
      hero.position.copy(atLagoon ? lagoonDock : riverDock);
      companion.reset(
        hero.position,
        atLagoon ? lagoon.blockers : riverside.blockers,
        atLagoon ? lagoon : riverside,
      );
      idleBoat();
      onSceneChange(atLagoon);
      toast(
        atLagoon
          ? "Lotus Lagoon · A sea of sunflowers and gemstones. Take the boat to return."
          : "Back at Rainbow Riverside · Your treasures are safe",
      );
    }
  }
  function reset(clearCollection = false) {
    if (clearCollection) lagoon.resetTreasures();
    const wasLagoon = atLagoon;
    rowing = false;
    atLagoon = false;
    elapsed = 0;
    switched = false;
    restorePose();
    lagoonGroup.visible = false;
    if (wasLagoon) riverside.group.add(companion.character);
    idleBoat();
  }
  return {
    lagoon,
    riverDock,
    lagoonDock,
    boat,
    nearby,
    start,
    update,
    reset,
    setEnabled(value) {
      enabled = value;
      boat.visible = value;
    },
    get rowing() {
      return rowing;
    },
    get atLagoon() {
      return atLagoon;
    },
  };
}
