const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");
(async () => {
  const elements = new Map();
  const element = (selector) => {
    if (!elements.has(selector))
      elements.set(selector, {
        style: {},
        firstChild: { textContent: "" },
        open: false,
        setAttribute() {},
        appendChild() {},
        addEventListener() {},
      });
    return elements.get(selector);
  };
  const context = vm.createContext({
    console,
    performance: { now: () => 0 },
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    window: {},
    requestAnimationFrame() {},
    addEventListener() {},
    document: {
      querySelector: element,
      addEventListener() {},
      body: { classList: { toggle() {} } },
    },
    FakeRenderer: class {
      constructor() {
        this.domElement = element("canvas");
        this.shadowMap = {};
      }
      setSize() {}
      setPixelRatio() {}
      render() {}
    },
  });
  const cache = new Map();
  async function module(name, source) {
    if (cache.has(name)) return cache.get(name);
    const m = new vm.SourceTextModule(
      source ?? fs.readFileSync("dist/" + name, "utf8"),
      { context },
    );
    cache.set(name, m);
    await m.link((s) => module(s.replace(/^\.\//, "").split("?")[0]));
    await m.evaluate();
    return m;
  }
  const game = fs.readFileSync("dist/game.js", "utf8");
  // Execute the actual game with only browser/rendering APIs stubbed.
  const setup =
    game.replace("new THREE.WebGLRenderer(", "new FakeRenderer(") +
    "\nexport {scene, mesh, box, cyl, ball, blockers, hero, body, legs, arms, held, lakeside, targets, shrine, inLake, createBenchMoment, clock, frame, axes, gems, won, camera, riverside, usePassage, yaw};";
  const G = (await module("review-setup", setup)).namespace;
  const T = (await module("vendor/three.module.js")).namespace;
  const C = (await module("companion.js")).namespace.createCompanion(G);
  const river = (await module("riverside.js")).namespace.createRiverside(G);
  const allowed = (p, obs = G.blockers) =>
    obs.every(
      (b) =>
        b.active === false ||
        Math.hypot(p.x - b.x, p.z - b.z) >=
          b.r + Math.max(0.38, b.minClearance ?? 0) - 1e-7,
    );
  assert(!allowed({ x: 0, z: -30 }));
  assert(!allowed({ x: 0, z: -25 }));
  assert(allowed({ x: 0, z: -26.5 })); // Quest remains reachable outside the shrine.
  assert(Math.hypot(0, -26.5 + 30) < 3.8);
  const uncovered = G.targets.filter((t) => allowed(t.g.position));
  assert.equal(uncovered.length, 0);
  for (const t of G.targets) assert(G.blockers.includes(t.blocker));
  const seat = { x: 14.5, z: 27.2 };
  assert(river.contains(seat.x, seat.z) && !allowed(seat, river.blockers));
  for (const x of [14.5, 17.5])
    for (let z = 24.7; z <= 27.3; z += 0.05)
      for (const dx of [-0.3, 0, 0.3])
        assert(!allowed({ x: x + dx, z }, river.blockers));
  const yaw = G.lakeside.bench.rotation.y;
  function world(x, z) {
    return new T.Vector3(x, 0, z)
      .applyAxisAngle(new T.Vector3(0, 1, 0), yaw)
      .add(G.lakeside.bench.position);
  }
  const bench = G.createBenchMoment({
    bench: G.lakeside.bench,
    hero: G.hero,
    heroRig: { body: G.body, legs: G.legs, arms: G.arms, held: G.held },
    companion: C,
    hearts: { clear() {}, contact() {} },
    toast() {},
  });
  for (const [a, b] of [
    [
      [2.5, 0],
      [-2.5, 0],
    ],
    [
      [-2.5, 0],
      [2.5, 0],
    ],
    [
      [2.5, 0],
      [2.5, -2.7],
    ],
    [
      [0, -2],
      [0, -3.5],
    ],
  ]) {
    G.hero.position.copy(world(...a));
    C.character.position.copy(world(...b));
    assert(bench.sit());
    for (let i = 0; i < 100; i++) {
      bench.update(0.01);
      assert(
        Math.hypot(
          G.hero.position.x - C.character.position.x,
          G.hero.position.z - C.character.position.z,
        ) >=
          1.2 - 1e-7,
      );
    }
    assert(
      Math.abs(
        Math.hypot(
          G.hero.position.x - C.character.position.x,
          G.hero.position.z - C.character.position.z,
        ) - 1.28,
      ) < 1e-7,
    );
    bench.stand();
  }
  const { resolveObstacleCollisions: resolve, overlapsObstacle: overlaps } = (
    await module("collision.js")
  ).namespace;
  const cave = (await module("cave.js")).namespace.createCave();
  const rocks = [];
  cave.interior.traverse((object) => {
    if (object.name === "cave-rock") rocks.push(object);
  });
  assert.equal(rocks.length, 26, "Every wall and exit boulder needs collision");
  for (const rock of rocks) {
    const center = rock.getWorldPosition(new T.Vector3());
    const blocker = cave.blockers.find(
      (b) => b.x === center.x && b.z === center.z,
    );
    assert(blocker && blocker.minClearance >= 0.8);
    const vertices = rock.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const vertex = new T.Vector3().fromBufferAttribute(vertices, i);
      rock.localToWorld(vertex);
      assert(
        Math.hypot(vertex.x - center.x, vertex.z - center.z) <=
          blocker.r + 1e-7,
      );
    }
  }
  // Sprint toward every section of the wall, including contacts at seams.
  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
    const position = new T.Vector3();
    for (let step = 0; step < 100; step++) {
      const previous = position.clone();
      position.x += Math.cos(angle) * 0.312;
      position.z += Math.sin(angle) * 0.312;
      resolve(position, previous, cave.blockers);
      cave.constrain(position);
      resolve(position, previous, cave.blockers);
      if (Math.hypot(position.x, position.z) > 16) position.copy(previous);
      assert(allowed(position, cave.blockers));
    }
  }
  const exit = new T.Vector3(0, 0, 12.1);
  assert(
    cave.isExit(exit) && allowed(exit, cave.blockers),
    "Rock collisions must leave the exit reachable",
  );
  const gardenRocks = G.blockers.filter(
    (b) => b.minClearance === 0.8 && b.z !== -43,
  );
  assert(gardenRocks.length > 0);
  for (const b of gardenRocks) {
    const position = new T.Vector3(b.x + b.r + 0.4, 0, b.z);
    resolve(position, new T.Vector3(b.x + b.r + 1, 0, b.z), [b]);
    assert(Math.hypot(position.x - b.x, position.z - b.z) >= b.r + 0.8 - 1e-7);
  }
  const old = new T.Vector3(-15.413497130319405, 0, 5.4462093989457285);
  assert(allowed(old));
  // Cover every sprint heading from the safe start used in the original reproduction.
  for (let angle = 0; angle < Math.PI * 2; angle += 0.01) {
    const pos = old
      .clone()
      .add(new T.Vector3(Math.cos(angle) * 0.312, 0, Math.sin(angle) * 0.312));
    resolve(pos, old, G.blockers);
    assert(allowed(pos));
  }
  // Break targets through the frame loop, then restore them through Restart.
  G.clock.getDelta = () => 0.04;
  for (const t of G.targets) {
    const projectile = new T.Group();
    projectile.position.copy(t.pos).add(new T.Vector3(0, 0, -0.76));
    G.axes.push({ g: projectile, dir: new T.Vector3(0, 0, 1), life: 1 });
  }
  G.frame();
  assert(G.targets.every((t) => t.hit && !t.blocker.active));
  // Collect all sunstones and complete the quest from outside the new shrine blocker.
  for (const gem of G.gems) {
    G.hero.position.copy(gem.g.position);
    G.frame();
  }
  G.hero.position.set(0, 0, -26.5);
  G.frame();
  assert(G.won, "The shrine blocker must not prevent quest completion");
  element("#restart").onclick();
  assert(G.targets.every((t) => !t.hit && t.blocker.active));
  assert(!G.won);
  G.usePassage(true, true);
  G.frame();
  assert(G.hero.position.distanceTo(G.riverside.arrival) < 1e-7);
  assert.equal(G.yaw, Math.PI, "Arrival must face the mountain");
  G.camera.updateMatrixWorld();
  for (const point of [
    new T.Vector3(Math.sin(56 * 0.12) * 3, 58, 104),
    new T.Vector3(Math.sin(56 * 0.12) * 3, 0.04, 71.8),
    G.hero.position.clone().add(new T.Vector3(0, 1.6, 0)),
  ]) {
    const projected = point.project(G.camera);
    assert(
      Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && projected.z < 1,
      "Mountain peak, waterfall base and characters must be visible on arrival",
    );
  }
  G.hero.position.copy(G.riverside.returnGate.position);
  for (let i = 0; i < 32; i++) G.frame();
  assert(
    G.hero.position.distanceTo(new T.Vector3(-28, 0, 0)) < 1e-7,
    "Stepping through the relocated gate must return to the garden",
  );
  const disabled = { x: 0, z: 0, r: 0.7, active: false };
  const center = new T.Vector3();
  resolve(center, new T.Vector3(0, 0, 2), [disabled]);
  assert.equal(center.length(), 0);
  disabled.active = true;
  resolve(center, new T.Vector3(0, 0, 2), [disabled]);
  assert(!overlaps(center, disabled));
  // An impossible corridor must fall back to the last safe point.
  const corridor = [
    { x: -0.5, z: 0, r: 1 },
    { x: 0.5, z: 0, r: 1 },
  ];
  const safe = new T.Vector3(0, 0, 3),
    trapped = new T.Vector3();
  resolve(trapped, safe, corridor);
  assert(corridor.every((b) => !overlaps(trapped, b)));
  console.log(
    "PASS: cave wall and exit rock coverage, sprint contacts around the chamber, reachable cave exit, garden rock clearance, garden solid blockers, reachable shrine quest, target blocker lifecycle, full gazebo seats, non-crossing bench approaches, repeated collision resolution, exact-center contacts and crowded-contact fallback",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
