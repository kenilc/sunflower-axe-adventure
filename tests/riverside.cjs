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
  const hills = river.group.children.filter(
    (o) => o.material?.color?.getHexString() === "7d9e77",
  );
  assert.equal(hills.length, 0, "Large hills must not return to the riverside");
  const trees = river.group.children.filter((o) => o.name === "riverside-tree");
  assert.equal(trees.length, 44);
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
  assert(river.contains(-16, 10), "Arrival must be walkable");
  assert(river.contains(-16, 14), "Return gate must be walkable");
  assert(river.isEntrance(new T.Vector3(-32, 0, 0)));
  assert(river.isExit(new T.Vector3(-16, 0, 14)));
  for (const time of [0, 1, 20, 500]) {
    river.update(time);
    river.group.traverse((o) =>
      assert(Number.isFinite(o.position.x) && Number.isFinite(o.position.z)),
    );
  }
  river.treasures[0].got = true;
  river.treasures[0].crystal.visible = false;
  const chunkGroups = (name) =>
    river.group.children.filter((o) => o.name === name);
  let disposedGeometry = 0,
    disposedMaterial = 0;
  for (const chunk of chunkGroups("river-chunk")) {
    chunk.traverse((o) => {
      o.geometry?.addEventListener("dispose", () => disposedGeometry++);
      if (o.userData.ownedMaterial)
        o.material.addEventListener("dispose", () => disposedMaterial++);
    });
  }
  const signature = () =>
    chunkGroups("meadow-chunk")
      .flatMap((c) => c.children.map((m) => `${m.position.x},${m.position.z}`))
      .sort()
      .join(";");
  river.ensureWorld(new T.Vector3(-16, 0, 10));
  const initialSignature = signature();
  for (const [x, z] of [
    [-8, 31.9],
    [-8, 32.1],
    [8, -32.1],
    [-8, 1000],
    [8, -1000],
    [10000, 5000],
    [-10000, -5000],
    [-8, 100000],
  ]) {
    assert(
      river.contains(x, z),
      "Walking must continue beyond the old world limits",
    );
    river.update(30, new T.Vector3(x, 0, z));
    assert.equal(
      chunkGroups("meadow-chunk").length,
      49,
      "Meadow chunks must stay bounded",
    );
    const chunks = chunkGroups("river-chunk").sort(
      (a, b) => a.userData.index - b.userData.index,
    );
    assert.equal(
      chunks.length,
      Math.abs(x) <= 180 ? 13 : 0,
      "River chunks must stay bounded",
    );
    if (chunks.length) {
      const start = chunks[0].children[0].geometry.attributes.position;
      const end =
        chunks[chunks.length - 1].children[0].geometry.attributes.position;
      assert(
        start.getZ(0) <= z - 180 && end.getZ(end.count - 1) >= z + 180,
        "River ends must remain beyond the visible camera range",
      );
      for (let i = 1; i < chunks.length; i++) {
        for (let layer = 0; layer < 3; layer++) {
          const left =
            chunks[i - 1].children[layer].geometry.attributes.position;
          const right = chunks[i].children[layer].geometry.attributes.position;
          for (let side = 0; side < 2; side++) {
            assert.equal(
              left.getX(left.count - 2 + side),
              right.getX(side),
              "Adjacent river and bank edges must join",
            );
            assert.equal(
              left.getZ(left.count - 2 + side),
              right.getZ(side),
              "Adjacent river and bank edges must join",
            );
          }
        }
      }
    }
    assert(
      river.treasures[0].got && !river.treasures[0].crystal.visible,
      "Streaming must preserve collection progress",
    );
  }
  assert(
    disposedGeometry > 0 && disposedMaterial > 0,
    "Unloaded river chunks must release GPU resources",
  );
  river.ensureWorld(new T.Vector3(-16, 0, 10));
  assert.equal(
    signature(),
    initialSignature,
    "Revisiting a meadow must regenerate the same scenery",
  );
  for (const z of [-100000, -64, 64, 100000])
    assert(
      !river.contains(Math.sin(z * 0.12) * 3, z),
      "River must still block walking at distant positions",
    );
  river.reset();
  assert(
    river.treasures.every((t) => !t.got && t.crystal.visible && t.glow.visible),
  );
  console.log(
    "PASS: endless traversal, seamless river chunks, bounded memory, resource disposal, deterministic revisits, preserved collection; hills removed, trees distant, canopy and sightline fading, opacity restoration; 18 accessible treasures, six varieties, bridge, water boundary, arrival/return gates, animations, and reset",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
