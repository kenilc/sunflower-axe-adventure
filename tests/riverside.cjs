const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");
(async () => {
  const context = vm.createContext({ console });
  const three = new vm.SourceTextModule(
    fs.readFileSync("dist/vendor/three.module.js", "utf8"),
    { context },
  );
  await three.link(() => {
    throw Error("Unexpected import");
  });
  await three.evaluate();
  const riverModule = new vm.SourceTextModule(
    fs.readFileSync("dist/riverside.js", "utf8"),
    { context },
  );
  const visibilityModule = new vm.SourceTextModule(
    fs.readFileSync("dist/tree-visibility.js", "utf8"),
    { context },
  );
  await visibilityModule.link(() => three);
  await visibilityModule.evaluate();
  await riverModule.link((specifier) =>
    specifier.includes("tree-visibility") ? visibilityModule : three,
  );
  await riverModule.evaluate();
  const T = three.namespace;
  const mesh = (geo, c, x = 0, y = 0, z = 0, parent) => {
    const m = new T.Mesh(
      geo,
      typeof c === "string" ? new T.MeshStandardMaterial({ color: c }) : c,
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const box = (w, h, d, c, x, y, z, p) =>
    mesh(new T.BoxGeometry(w, h, d), c, x, y, z, p);
  const cyl = (a, b, h, c, x, y, z, p, n = 8) =>
    mesh(new T.CylinderGeometry(a, b, h, n), c, x, y, z, p);
  const ball = (r, c, x, y, z, p) =>
    mesh(new T.IcosahedronGeometry(r, 1), c, x, y, z, p);
  const river = riverModule.namespace.createRiverside({ mesh, box, cyl, ball });
  const mountain = river.group.getObjectByName("waterfall-mountain");
  assert(mountain, "A mountain must supply the rainbow waterfall");
  const mountainBounds = new T.Box3().setFromObject(mountain);
  assert(
    mountainBounds.min.z > 56,
    "Mountain scenery must stay beyond the walking area",
  );
  assert(mountainBounds.max.y > 55, "The source mountain must be tall");
  const forest = mountain.getObjectByName("mountain-forest");
  assert(forest.children.length <= 12, "Dense forest must use instancing");
  assert(
    forest.userData.treeCount >= 1500,
    "All mountain slopes need dense tree coverage",
  );
  assert.deepEqual(Array.from(forest.userData.varieties).sort(), [
    "birch",
    "oak",
    "pine",
    "spruce",
  ]);
  const grass = mountain.getObjectByName("mountain-grass");
  assert(
    grass && grass.userData.tuftCount >= 8000,
    "Grass must cover all mountain slopes",
  );
  assert.equal(
    grass.children.length,
    1,
    "Grass must share a single instanced batch",
  );
  mountain.updateWorldMatrix(true, true);
  const terrain = mountain.children.filter(
    (o) => o.isMesh && o.geometry.parameters.radius !== 6.5,
  );
  const ray = new T.Raycaster();
  const matrix = new T.Matrix4();
  const root = new T.Vector3(),
    scale = new T.Vector3(),
    rotation = new T.Quaternion();
  let westTrees = 0,
    eastTrees = 0,
    upperTrees = 0;
  for (const batch of forest.children.filter((o) =>
    o.name.endsWith("-trunks"),
  )) {
    for (let i = 0; i < batch.count; i++) {
      batch.getMatrixAt(i, matrix);
      matrix.decompose(root, rotation, scale);
      root.y -= scale.y / 2;
      if (root.x < -25) westTrees++;
      if (root.x > 30) eastTrees++;
      if (root.y > 30) upperTrees++;
      if (i % 90 === 0) {
        ray.set(new T.Vector3(root.x, 100, root.z), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObjects(terrain, false)[0];
        assert(
          hit && Math.abs(hit.point.y - root.y - 0.05) < 0.00001,
          "Tree roots must follow the visible slope, including overlapping peaks",
        );
      }
    }
  }
  assert(
    westTrees > 200 && eastTrees > 200 && upperTrees > 100,
    "Trees must cover both outer mountains and the upper slopes",
  );
  const trees = river.group.children.filter((o) => o.name === "riverside-tree");
  assert(trees.length > 0 && trees.length <= 44);
  for (const tree of trees) {
    const bounds = new T.Box3().setFromObject(tree);
    assert(
      bounds.min.x > 34 || bounds.max.x < -34,
      "Tree canopies must remain well outside the walking area",
    );
  }
  const camera = new T.PerspectiveCamera();
  const hero = new T.Group();
  // At the east edge, a low, fully zoomed-out camera sits inside this canopy.
  const tree = trees.find(
    (t) =>
      t.children[0].position.x === 40.4 &&
      Math.abs(t.children[0].position.z - 5.6) < 0.01,
  );
  assert(tree, "Expected east-side tree");
  hero.position.set(21.5, 0, 5.6);
  camera.position.set(40.4, 3.3, 5.6);
  camera.lookAt(hero.position.clone().add(new T.Vector3(0, 1.6, 0)));
  river.updateVisibility(camera, [hero], 1);
  assert(
    tree.children.every(
      (m) => m.material.opacity < 0.09 && !m.material.depthWrite,
    ),
    "Trees must fade even when the camera is inside their canopy",
  );
  camera.position.set(16, 5, 5.6);
  camera.lookAt(hero.position.clone().add(new T.Vector3(0, 1.6, 0)));
  river.updateVisibility(camera, [hero], 1);
  assert(
    tree.children.every(
      (m) => m.material.opacity === 1 && m.material.depthWrite,
    ),
    "Clear scenery must become opaque again",
  );
  camera.position.set(60, 4, 5.6);
  camera.lookAt(hero.position.clone().add(new T.Vector3(0, 1.6, 0)));
  river.updateVisibility(camera, [hero], 1);
  assert(
    tree.children.every((m) => m.material.opacity < 0.09),
    "Trees between the camera and hero must fade",
  );
  assert.equal(river.landmarks.length, 4);
  assert.equal(river.clusters.length, 6);
  assert.equal(
    river.group.getObjectByName("waterfall-rainbow").children.length,
    7,
  );
  for (const l of river.landmarks) {
    assert(river.contains(l.x, l.z), l.name + " must be reachable");
    assert.equal(river.locationAt(new T.Vector3(l.x, 0, l.z)), l.name);
  }
  for (const treasure of river.treasures) {
    assert(
      !river.blockers.some(
        (b) =>
          Math.hypot(
            treasure.crystal.position.x - b.x,
            treasure.crystal.position.z - b.z,
          ) <
          b.r + 0.38,
      ),
      "Hidden treasure must not overlap landmark collision",
    );
  }
  const gazebo = river.group.getObjectByName("The flower gazebo");
  hero.position.set(16, 0, 26);
  camera.position.set(16, 3.2, 26);
  camera.lookAt(16, 1, 26);
  river.updateVisibility(camera, [hero], 1);
  assert(
    gazebo.children.every((m) => m.material.opacity === 0),
    "Gazebo must fade when its roof encloses the camera",
  );
  assert.equal(river.treasures.length, 18);
  assert.equal(new Set(river.treasures.map((t) => t.name)).size, 6);
  for (const t of river.treasures)
    assert(
      river.contains(t.crystal.position.x, t.crystal.position.z),
      t.name + " must be reachable",
    );
  for (let x = -5.8; x < 5.8; x += 0.1)
    assert(river.contains(x, 0), "Bridge must cross the water");
  assert(!river.contains(0, 10), "Water must block walking");
  assert(
    river.contains(river.arrival.x, river.arrival.z),
    "Arrival must be walkable",
  );
  assert(
    river.contains(river.returnGate.position.x, river.returnGate.position.z),
    "Return gate must be walkable",
  );
  assert(river.isEntrance(new T.Vector3(-32, 0, 0)));
  assert(river.isExit(river.returnGate.position));
  assert(
    !river.isExit(river.arrival),
    "Arrival must not immediately send characters back",
  );
  assert(
    !river.isExit(new T.Vector3(-16, 0, 14)),
    "The old return location must no longer teleport",
  );
  for (const time of [0, 1, 20, 500]) {
    river.update(time);
    river.group.traverse((o) =>
      assert(Number.isFinite(o.position.x) && Number.isFinite(o.position.z)),
    );
  }
  river.treasures[0].got = true;
  river.treasures[0].crystal.visible = false;
  const island = river.group.getObjectByName("riverside-island");
  assert(island, "A visible island must define the boundary");
  const bounds = new T.Box3().setFromObject(island);
  assert.equal(bounds.min.x, -48);
  assert.equal(bounds.max.x, 48);
  assert.equal(bounds.min.z, -56);
  assert.equal(bounds.max.z, 56);
  for (const [x, z] of [
    [49, 0],
    [-49, 0],
    [8, 56],
    [8, -56],
    [40, 45],
    [-8, 1000],
    [10000, 5000],
  ]) {
    assert(
      !river.contains(x, z),
      "Characters must remain on the visible island",
    );
  }
  assert(
    river.contains(46, 0),
    "The east meadow remains accessible close to its visible edge",
  );
  assert(
    river.contains(-46, 0),
    "The west meadow remains accessible close to its visible edge",
  );
  assert(river.contains(8, 53), "Characters can approach the waterfall bank");
  const water =
    river.group.getObjectByName("island-river").geometry.attributes.position;
  const falls = river.group.children.filter((o) => o.name === "edge-waterfall");
  assert.equal(
    falls.length,
    1,
    "Only the downstream end should fall off the island",
  );
  for (let end = 0; end < 1; end++) {
    const first = end === 0 ? 0 : water.count - 2;
    const waterfall = falls[end].geometry.attributes.position;
    for (const side of [0, 1]) {
      const wi = first + side,
        fi = side === 0 ? 0 : waterfall.count - 2;
      const x = water.getX(wi),
        z = water.getZ(wi);
      assert(
        Math.abs(Math.hypot(x / 48, z / 56) - 1) < 0.000001,
        "River must meet the island rim, not stop inland",
      );
      assert(
        Math.abs(x - waterfall.getX(fi)) < 0.00001 &&
          Math.abs(z - waterfall.getZ(fi)) < 0.00001,
        "Waterfalls must connect exactly to the river endpoints",
      );
      assert(
        waterfall.getY(fi + 1) < bounds.min.y,
        "Waterfall must continue below the island",
      );
    }
  }
  const sourceFall = river.group.getObjectByName("mountain-waterfall");
  const fallBounds = new T.Box3().setFromObject(sourceFall);
  assert(fallBounds.max.y > 30 && Math.abs(fallBounds.min.y - 0.04) < 0.000001);
  const feeder = river.group.getObjectByName("waterfall-river-feed").geometry
    .attributes.position;
  for (let side = 0; side < 2; side++) {
    const wi = water.count - 2 + side;
    assert(Math.abs(feeder.getX(side) - water.getX(wi)) < 0.00001);
    assert(Math.abs(feeder.getZ(side) - water.getZ(wi)) < 0.00001);
    assert(
      Math.abs(feeder.getZ(2 + side) - fallBounds.min.z) < 0.00001,
      "The plunge pool must connect to the foot of the mountain waterfall",
    );
  }
  const rainbow = river.group.getObjectByName("waterfall-rainbow");
  assert(
    rainbow.position.z > 56 && rainbow.position.z < fallBounds.min.z,
    "The rainbow must sit in front of the mountain waterfall",
  );
  const ripple = river.group.children.find(
    (o) => o.geometry?.parameters?.width === 0.65,
  );
  river.update(0);
  const startZ = ripple.position.z;
  river.update(0.5);
  assert(
    ripple.position.z < startZ,
    "River animation must flow away from its source",
  );
  for (const tree of trees) {
    const trunk = tree.children[0].position;
    assert(
      Math.hypot(trunk.x / 48, trunk.z / 56) < 1,
      "Trees must stand on the island",
    );
  }
  const childCount = river.group.children.length;
  for (const time of [1, 20, 1000]) river.update(time);
  assert.equal(
    river.group.children.length,
    childCount,
    "Finite scenery must remain stable",
  );
  assert(
    river.treasures[0].got && !river.treasures[0].crystal.visible,
    "Animations must preserve collected treasures",
  );
  river.reset();
  assert(
    river.treasures.every((t) => !t.got && t.crystal.visible && t.glow.visible),
  );
  const boatModule = new vm.SourceTextModule(
    fs.readFileSync("dist/boat-trip.js", "utf8"),
    { context },
  );
  await boatModule.link(() => three);
  await boatModule.evaluate();
  const rig = () => ({
    body: new T.Group(),
    legs: [0, 1].map(() => {
      const l = new T.Group();
      l.add(new T.Group(), new T.Group());
      return l;
    }),
    arms: [new T.Group(), new T.Group()],
    held: { visible: true },
  });
  const rider = new T.Group(),
    friend = new T.Group(),
    heroRig = rig();
  const companion = {
    character: friend,
    rig: rig(),
    reset(p) {
      friend.position.copy(p).add(new T.Vector3(1, 0, 0));
    },
  };
  const scene = new T.Scene();
  scene.add(river.group, rider);
  const transitions = [];
  const trip = boatModule.namespace.createBoatTrip({
    mesh,
    box,
    cyl,
    ball,
    scene,
    riverside: river,
    hero: rider,
    heroRig,
    companion,
    toast() {},
    onSceneChange(value) {
      transitions.push(value);
    },
  });
  trip.setEnabled(true);
  rider.position.set(-25, 0, 30);
  assert(!trip.start(), "Boarding requires proximity to the dock");
  rider.position.copy(trip.riverDock);
  assert(trip.start());
  assert(!trip.start(), "Repeated boarding must not restart the trip");
  trip.update(1);
  assert(
    trip.rowing && !heroRig.held.visible && heroRig.legs[0].rotation.x < 0,
    "Both characters must sit during travel",
  );
  assert(
    Math.hypot(
      rider.position.x - friend.position.x,
      rider.position.z - friend.position.z,
    ) < 1.5,
    "Characters must remain together in the boat",
  );
  trip.update(4.1);
  assert(
    trip.atLagoon && trip.lagoon.group.visible && !river.group.visible,
    "Trip must switch to a distinct lagoon scene",
  );
  trip.update(4);
  assert(
    !trip.rowing && trip.atLagoon && heroRig.held.visible,
    "Arrival must restore walking pose",
  );
  assert(
    trip.lagoon.contains(rider.position.x, rider.position.z),
    "Lagoon arrival must be walkable",
  );
  assert(
    trip.lagoon.contains(0, 10) && trip.lagoon.contains(0, 4),
    "Bridge must reach the flower island",
  );
  assert(
    !trip.lagoon.contains(8, 8) && !trip.lagoon.contains(30, 0),
    "Lagoon water and world edge must block walking",
  );
  assert.equal(
    trip.lagoon.sunflowerCount,
    900,
    "Lagoon must contain dense sunflower beds",
  );
  assert.equal(
    trip.lagoon.treasures.length,
    240,
    "Lagoon must contain plentiful collectible treasures",
  );
  for (const t of trip.lagoon.treasures) {
    assert(
      trip.lagoon.contains(t.position.x, t.position.z),
      "Every lagoon treasure must be walkable",
    );
    trip.lagoon.collect(t.position);
  }
  assert.equal(
    trip.lagoon.collected,
    240,
    "All lagoon treasures must be collectible",
  );
  assert.equal(
    trip.lagoon.collect(trip.lagoon.treasures[0].position),
    null,
    "Collected treasures must not count again",
  );
  assert(trip.start(), "Return trip must be available at the arrival dock");
  trip.update(5.1);
  trip.update(4);
  assert(
    !trip.atLagoon &&
      !trip.rowing &&
      river.group.visible &&
      !trip.lagoon.group.visible,
    "Return must restore the riverside scene",
  );
  assert(
    river.contains(rider.position.x, rider.position.z),
    "Return landing must be walkable",
  );
  assert(friend.parent === river.group, "Companion must return with the hero");
  assert(trip.start());
  trip.update(5.1);
  trip.reset();
  assert.equal(
    trip.lagoon.collected,
    240,
    "Boat travel must preserve lagoon treasures",
  );
  trip.reset(true);
  assert.equal(
    trip.lagoon.collected,
    0,
    "New adventure must reset all lagoon treasures",
  );
  assert(trip.lagoon.treasures.every((t) => !t.got));
  assert(
    !trip.rowing &&
      !trip.atLagoon &&
      heroRig.held.visible &&
      !trip.lagoon.group.visible,
    "Restart during travel must clear the boat state",
  );
  console.log(
    "PASS: 900 instanced sunflowers, 240 collectible lagoon treasures, collection persistence and reset, boarding, seated travel, lagoon exploration, return landing, trip reset, four accessible landmarks, six collectible clusters, rainbow, 1800 trees in four varieties across three peaks, 9000 grass tufts, forested source mountain, waterfall feeding the river, gazebo fading, visible island boundary, accessible edge banks, river-to-waterfall connections, stable finite scenery, tree fading, 18 accessible treasures, bridge, gates, and reset",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
