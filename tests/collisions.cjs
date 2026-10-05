const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");
(async () => {
  const elements = new Map();
  const handlers = new Map();
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
    setTimeout(fn) {
      fn();
    },
    performance: { now: () => 0 },
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    window: {},
    requestAnimationFrame() {},
    addEventListener(name, callback) {
      handlers.set(name, callback);
    },
    document: {
      querySelector: element,
      createElement() {
        return {
          width: 0,
          height: 0,
          getContext() {
            return { fillRect() {}, fillText() {} };
          },
        };
      },
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
      render(scene, camera) {
        this.scene = scene;
        this.camera = camera;
      }
    },
  });
  const cache = new Map();
  function getModule(name, source) {
    if (cache.has(name)) return cache.get(name);
    const m = new vm.SourceTextModule(
      source ?? fs.readFileSync("dist/" + name, "utf8"),
      { context },
    );
    cache.set(name, m);
    return m;
  }
  async function module(name, source) {
    const m = getModule(name, source);
    // Let the VM link shared dependencies as one graph, including diamonds.
    if (m.status === "unlinked")
      await m.link((s) => getModule(s.replace(/^\.\//, "").split("?")[0]));
    if (m.status === "linked") await m.evaluate();
    return m;
  }
  const game = fs.readFileSync("dist/game.js", "utf8");
  // Execute the actual game with only browser/rendering APIs stubbed.
  const setup =
    game.replace("new THREE.WebGLRenderer(", "new FakeRenderer(") +
    "\nexport {scene, mesh, box, cyl, ball, blockers, hero, body, legs, arms, held, lakeside, targets, shrine, inLake, createBenchMoment, clock, frame, axes, gems, won, camera, riverside, usePassage, yaw, insideRiver, insideCave, passageTransition, cableCar, boatTrip, companion, boardCableCar, boardBoat, fire, keys, insideCastle, castleRoom, useCastlePassage, changeCastlePassage, interactCastle, bedRest, eyes, funfair, funfairActivities, insideFunfair, useFunfairPassage, interactFunfair, garden, renderer, pitch, zoom, village, alpineOutfits, insideVillage, activeVillageShop, alpineCart, useVillagePassage, useVillageShop, interactVillage, festival, insideFestival, changeFestivalPassage, useFestivalPassage, festivalMoment, summerOutfits, interactFestival};";
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
  for (let i = 0; i < 12; i++) G.frame();
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
  for (let i = 0; i < 45; i++) G.frame();
  assert(
    G.hero.position.distanceTo(new T.Vector3(-28, 0, 0)) < 1e-7,
    "Stepping through the relocated gate must return to the garden",
  );
  const { createSceneTransition } = (await module("scene-transition.js"))
    .namespace;
  let opacity = 0,
    switches = 0;
  const transition = createSceneTransition((value) => {
    opacity = value;
  });
  assert(
    transition.start(() => {
      assert.equal(opacity, 1);
      switches++;
    }),
  );
  assert(
    !transition.start(() => {
      throw Error("Duplicate transition");
    }),
  );
  transition.update(0.09);
  assert.equal(switches, 0);
  assert(Math.abs(opacity - 0.5) < 1e-7);
  transition.update(0.09);
  assert.equal(switches, 1);
  assert.equal(opacity, 1);
  transition.update(0.09);
  assert(Math.abs(opacity - 0.5) < 1e-7);
  transition.update(0.1);
  assert(!transition.active && opacity === 0 && switches === 1);
  transition.start(() => {
    switches++;
  });
  transition.cancel();
  transition.update(1);
  assert.equal(switches, 1, "Canceled transitions must never change the scene");
  // Exercise entering and leaving both gate destinations through real game frames.
  for (const riverDestination of [false, true]) {
    for (const enter of [true, false]) {
      const source = G.hero.position.clone();
      G.usePassage(enter, riverDestination);
      assert(G.passageTransition.active);
      for (let i = 0; i < 4; i++) G.frame();
      assert(
        G.hero.position.distanceTo(source) < 1e-7,
        "Fade-out must hold the current scene",
      );
      G.frame();
      assert.equal(riverDestination ? G.insideRiver : G.insideCave, enter);
      for (let i = 0; i < 6; i++) G.frame();
      assert(!G.passageTransition.active);
      assert.equal(element("#sceneTransition").style.opacity, "0");
    }
  }
  G.usePassage(true, true);
  element("#restart").onclick();
  for (let i = 0; i < 12; i++) G.frame();
  assert(!G.insideRiver && !G.insideCave && !G.passageTransition.active);
  assert(
    G.hero.position.distanceTo(new T.Vector3(0, 0, 7)) < 1e-7,
    "Restart during a fade must cancel the queued gate destination",
  );
  // A real round trip through boat arrival, cable-car boarding and summit walking.
  G.usePassage(true, true);
  for (let i = 0; i < 12; i++) G.frame();
  assert(
    !G.cableCar.start(),
    "The cable car must be unavailable outside the lagoon",
  );
  G.hero.position.copy(G.boatTrip.riverDock);
  G.boardBoat();
  for (let i = 0; i < 240; i++) G.frame();
  assert(G.boatTrip.atLagoon && !G.boatTrip.rowing);
  const lagoonMountain = G.cableCar.group.getObjectByName("lagoon-mountain");
  assert(lagoonMountain, "The lagoon has a forested mountain backdrop");
  assert.equal(
    lagoonMountain.getObjectByName("mountain-forest").userData.treeCount,
    1800,
  );
  assert.equal(
    lagoonMountain.getObjectByName("mountain-grass").userData.tuftCount,
    9000,
  );
  assert.equal(
    lagoonMountain.getObjectByName("lagoon-rocky-slope").children.length,
    8,
  );
  for (const name of [
    "mountain-waterfall",
    "waterfall-rainbow",
    "waterfall-source-stream",
    "waterfall-river-feed",
    "waterfall-mist",
    "mountain-waterfall-streak",
    "mountain-waterfall-foam",
  ])
    assert(
      !G.cableCar.group.getObjectByName(name),
      `The lagoon must not duplicate ${name}`,
    );
  assert(G.riverside.group.getObjectByName("mountain-waterfall").visible);
  assert(G.riverside.group.getObjectByName("waterfall-rainbow").visible);

  assert(
    !G.cableCar.start(),
    "Boarding must require proximity to the island station",
  );
  const treasure = G.boatTrip.lagoon.treasures[0];
  G.boatTrip.lagoon.collect(treasure.position);
  const preserved = G.boatTrip.lagoon.collected;
  G.hero.position.copy(G.cableCar.islandDock);
  G.boardCableCar();
  assert(G.cableCar.riding && !G.held.visible);
  assert(!G.cableCar.start(), "Repeated boarding must not restart the ride");
  const launchY = G.hero.position.y;
  for (let i = 0; i < 150; i++) G.frame();
  assert(G.cableCar.riding && G.hero.position.y > launchY + 15);
  assert(
    Math.abs(G.hero.position.x - G.companion.character.position.x) >= 1.5,
    "Both riders need room inside the cabin",
  );
  G.fire();
  assert.equal(G.axes.length, 0, "Axes must be disabled inside the cable car");
  for (let i = 0; i < 160; i++) G.frame();
  assert(G.cableCar.atSummit && !G.cableCar.riding && G.held.visible);
  assert(G.cableCar.summit.contains(G.hero.position.x, G.hero.position.z));
  assert.equal(
    G.hero.position.y,
    G.cableCar.summit.heightAt(G.hero.position.x, G.hero.position.z),
  );
  G.boardBoat();
  assert(!G.boatTrip.rowing, "The boat must be inaccessible from the summit");
  assert(
    !G.cableCar.summit.contains(G.hero.position.x + 30, G.hero.position.z),
    "The summit deck must have a finite walking boundary",
  );
  const castle = G.cableCar.summit.castle;
  assert(!castle.inside(G.hero.position));
  G.keys.KeyW = true;
  for (let i = 0; i < 45; i++) G.frame();
  G.keys.KeyW = false;
  assert(G.insideCastle, "Walking into the arch enters a separate room");
  assert(
    G.castleRoom.group.visible &&
      !G.cableCar.group.visible &&
      !G.boatTrip.boat.visible,
  );
  assert(G.companion.character.parent === G.castleRoom.group);
  assert.equal(G.hero.position.y, 0);
  assert(G.castleRoom.contains(G.hero.position.x, G.hero.position.z));
  G.boardCableCar();
  G.boardBoat();
  G.fire();
  assert(!G.cableCar.riding && !G.boatTrip.rowing && !G.axes.length);
  const room = G.castleRoom;
  assert(!room.contains(12, 0));
  assert(
    !allowed(room.bed.group.position, room.blockers),
    "The bed is solid while walking",
  );
  G.hero.position.copy(room.bed.wakePositions[0]);
  G.companion.reset(G.hero.position, room.blockers, room);
  G.interactCastle();
  assert(
    G.passageTransition.active && !G.bedRest.resting,
    "Bed poses change under the fade",
  );
  for (let i = 0; i < 12; i++) G.frame();
  assert(G.bedRest.resting && !G.held.visible);
  const daylight = G.scene.children.find((c) => c.isDirectionalLight);
  const ambient = G.scene.children.find((c) => c.isHemisphereLight);
  assert.equal(daylight.intensity, 0.16);
  assert.equal(ambient.intensity, 0.28);
  assert.equal(G.scene.background.getHexString(), "363440");
  assert(room.bed.blanket.cover.visible && !room.bed.blanket.spread.visible);
  assert(
    room.bed.bedsideLight.intensity > 0,
    "A warm lamp lights the sleepers",
  );
  for (const v of room.bed.blanket.quilt.geometry.attributes.position.array)
    assert(Number.isFinite(v), "The draped quilt has finite geometry");
  for (const [c, other, rig] of [
    [G.hero, G.companion.character, { arms: G.arms, eyes: G.eyes }],
    [G.companion.character, G.hero, G.companion.rig],
  ]) {
    const forward = new T.Vector3(0, 0, 1).applyQuaternion(c.quaternion);
    const towardPartner = other.position.clone().sub(c.position).normalize();
    assert(
      forward.dot(towardPartner) > 0.9,
      "Resting characters face each other",
    );
    assert(
      new T.Vector3(0, 1, 0)
        .applyQuaternion(c.quaternion)
        .distanceTo(new T.Vector3(0, 0, -1)) < 1e-7,
      "Both lie along the bed",
    );
    assert(
      rig.eyes.closed.visible && !rig.eyes.open.visible,
      "Both close their eyes",
    );
    assert(
      rig.arms.every((arm) => arm.rotation.x < -1 && arm.position.z > 0.3),
      "Arms reach around the partner",
    );
  }
  const faces = [G.hero, G.companion.character].map((c) =>
    c.localToWorld(new T.Vector3(0, 2.12, 0.23)),
  );
  assert(
    faces[0].distanceTo(faces[1]) > 0.98,
    "Faces must not overlap during the hug",
  );
  for (const face of faces) {
    const p = room.bed.group.worldToLocal(face.clone());
    assert(
      p.z < room.bed.blanket.leadingEdge(p.x),
      "Faces stay above the blanket",
    );
  }
  const handSets = [
    G.arms.map((a) => a.children[1]),
    G.companion.rig.arms.map((a) => a.children[3]),
  ];
  for (const hands of handSets) {
    const upperHand = hands
      .map((h) => h.getWorldPosition(new T.Vector3()))
      .sort((a, b) => b.y - a.y)[0];
    const p = room.bed.group.worldToLocal(upperHand);
    assert(
      p.z < room.bed.blanket.leadingEdge(p.x),
      "Joined hands remain above the blanket",
    );
  }
  assert(G.hero.position.distanceTo(G.companion.character.position) > 1.2);
  assert(room.bed.sleepSymbols.every((s) => s.visible));
  const lyingPosition = G.hero.position.clone();
  G.keys.KeyW = true;
  for (let i = 0; i < 40; i++) G.frame();
  assert(
    G.hero.position.equals(lyingPosition),
    "Movement cannot disturb a resting pose",
  );
  const breath = G.body.position.z;
  element("#guide").open = true;
  G.frame();
  assert.equal(
    G.body.position.z,
    breath,
    "Rest animation pauses with the guide",
  );
  element("#guide").open = false;
  G.interactCastle();
  for (let i = 0; i < 12; i++) G.frame();
  assert(!G.bedRest.resting && !G.keys.KeyW);
  assert.equal(daylight.intensity, 1.7);
  assert.equal(ambient.intensity, 1.6);
  assert.equal(G.scene.background.getHexString(), "cab5b0");
  assert(!room.bed.blanket.cover.visible && room.bed.blanket.spread.visible);
  assert.equal(room.bed.bedsideLight.intensity, 0);
  for (const c of [G.hero, G.companion.character]) {
    assert.equal(c.rotation.x, 0);
    assert(
      allowed(c.position, room.blockers) &&
        room.contains(c.position.x, c.position.z),
      "Get up lands on a clear floor spot",
    );
  }
  assert(!room.bed.sleepSymbols.some((s) => s.visible));
  for (const rig of [{ arms: G.arms, eyes: G.eyes }, G.companion.rig]) {
    assert(
      rig.eyes.open.visible && !rig.eyes.closed.visible,
      "Eyes reopen when getting up",
    );
    assert(
      rig.arms.every(
        (arm) =>
          arm.position.z === 0 &&
          Math.abs(arm.position.x) === 0.5 &&
          arm.position.y === 1.55 &&
          Math.abs(arm.rotation.x) < 0.5,
      ),
      "The standing arm pose is restored",
    );
  }

  assert(!allowed({ x: 5, z: 2 }, room.blockers), "Furniture is solid");
  assert(!room.interact(new T.Vector3(0, 0, 8), 0));
  const chestSpot = new T.Vector3(0, 0, 0.5);
  assert(allowed(chestSpot, room.blockers));
  assert.equal(room.interact(chestSpot, 0).kind, "locked");
  // Both characters have a clear lane between the sofa and the relocated chest.
  for (let z = -9; z <= -4; z += 0.1) {
    const woman = new T.Vector3(-1.5, 0, z),
      man = new T.Vector3(0.1, 0, z);
    assert(
      allowed(woman, room.blockers) && allowed(man, room.blockers),
      "Sofa aisle has room for both characters",
    );
    assert(woman.distanceTo(man) > G.companion.contactDistance);
  }
  G.hero.position.set(-1.5, 0, -9);
  G.companion.reset(new T.Vector3(2, 0, -9), room.blockers, room);
  G.keys.KeyS = true;
  for (let i = 0; i < 24; i++) {
    G.frame();
    assert(allowed(G.hero.position, room.blockers));
    assert(allowed(G.companion.character.position, room.blockers));
  }
  G.keys.KeyS = false;
  assert(
    G.hero.position.z > -4.6,
    "The player can walk through the sofa aisle",
  );
  assert.equal(room.treasureBoxes.filter((b) => b.kind === "coins").length, 2);
  assert.equal(room.treasureBoxes.filter((b) => b.kind === "gems").length, 2);
  for (const crate of room.treasureBoxes) {
    assert(
      !allowed(crate.group.position, room.blockers),
      "Treasure boxes are solid",
    );
    const bounds = new T.Box3().setFromObject(crate.group);
    assert(
      bounds.max.x < -4 || bounds.min.x > 4,
      "Boxes keep the central aisle clear",
    );
  }
  // Explore the real navigable floor, including every star and activity.
  const start = [0, 8],
    queue = [start],
    reached = new Set([start.join(",")]);
  for (let head = 0; head < queue.length; head++) {
    const [x, z] = queue[head];
    for (const [dx, dz] of [
      [0.5, 0],
      [-0.5, 0],
      [0, 0.5],
      [0, -0.5],
    ]) {
      const next = [x + dx, z + dz],
        key = next.join(",");
      if (
        reached.has(key) ||
        !room.contains(...next) ||
        !allowed({ x: next[0], z: next[1] }, room.blockers)
      )
        continue;
      reached.add(key);
      queue.push(next);
    }
  }
  for (const star of room.stars) {
    assert(
      queue.some(([x, z]) => Math.hypot(x - star.x, z - star.z) < 1.3),
      "Each hidden star is reachable",
    );
    G.hero.position.set(star.x, 0, star.z);
    assert(allowed(G.hero.position, room.blockers));
    G.frame();
  }
  assert.equal(room.collected, 6);
  assert(!room.collect(G.hero.position), "Stars cannot be collected twice");
  for (const activity of room.activities) {
    const reachable = queue.find(
      ([x, z]) => room.nearby(new T.Vector3(x, 0, z)) === activity,
    );
    assert(reachable, `${activity.kind} is reachable`);
    const result = room.interact(
      new T.Vector3(reachable[0], 0, reachable[1]),
      0,
    );
    assert.equal(result.kind, activity.kind);
  }
  assert(room.opened);
  const pianoSpot = queue.find(
    ([x, z]) => room.nearby(new T.Vector3(x, 0, z))?.kind === "piano",
  );
  G.hero.position.set(pianoSpot[0], 0, pianoSpot[1]);
  assert(allowed(G.hero.position, room.blockers));
  G.interactCastle();
  assert(
    element("#toast").textContent.includes("melody"),
    "Piano action schedules its melody",
  );
  for (let i = 0; i < 80; i++) G.frame();

  G.hero.position.copy(chestSpot);
  G.interactCastle();
  assert(element("#toast").textContent.includes("wishing star"));
  for (let i = 0; i < 30; i++) G.frame();
  G.hero.position.set(0, 0, 11.5);
  G.frame();
  assert(G.passageTransition.active && G.insideCastle);
  for (let i = 0; i < 12; i++) G.frame();
  assert(!G.insideCastle && !room.group.visible && G.cableCar.group.visible);
  assert(G.cableCar.atSummit);
  assert(allowed(G.hero.position, G.cableCar.summit.blockers));
  assert.equal(room.collected, 6, "Treasure hunt persists after leaving");
  G.useCastlePassage(true);
  for (let i = 0; i < 12; i++) G.frame();
  assert(G.insideCastle && room.opened);
  G.hero.position.copy(room.bed.wakePositions[0]);
  G.interactCastle();
  for (let i = 0; i < 12; i++) G.frame();
  assert(G.bedRest.resting);
  G.useCastlePassage(false);
  for (let i = 0; i < 12; i++) G.frame();
  assert(
    !G.bedRest.resting &&
      G.hero.rotation.x === 0 &&
      G.eyes.open.visible &&
      G.companion.rig.eyes.open.visible,
  );
  G.hero.position.copy(G.cableCar.summitDock);
  G.boardCableCar();
  for (let i = 0; i < 310; i++) G.frame();
  assert(!G.cableCar.atSummit && !G.cableCar.riding);
  assert(G.boatTrip.lagoon.contains(G.hero.position.x, G.hero.position.z));
  assert.equal(G.boatTrip.lagoon.collected, preserved);
  assert(G.companion.character.parent === G.boatTrip.lagoon.group);
  G.boardCableCar();
  for (let i = 0; i < 310; i++) G.frame();
  G.useCastlePassage(true);
  for (let i = 0; i < 12; i++) G.frame();
  assert(G.insideCastle);
  G.hero.position.copy(room.bed.wakePositions[0]);
  G.interactCastle();
  for (let i = 0; i < 12; i++) G.frame();
  assert(G.bedRest.resting);
  element("#restart").onclick();
  G.frame();
  assert(
    !G.cableCar.riding && !G.cableCar.atSummit && !G.cableCar.group.visible,
  );
  assert(
    !G.insideCastle &&
      !room.group.visible &&
      room.collected === 0 &&
      !room.opened,
  );
  assert(
    !G.bedRest.resting &&
      G.hero.rotation.x === 0 &&
      G.companion.character.rotation.x === 0,
  );
  assert(G.eyes.open.visible && G.companion.rig.eyes.open.visible);
  assert(!G.boatTrip.atLagoon && !G.boatTrip.rowing && G.held.visible);
  assert(G.hero.position.distanceTo(new T.Vector3(0, 0, 7)) < 1e-7);
  // Exercise the actual scene transitions, walking, rides, and ring-toss game.
  const park = G.funfair,
    fair = G.funfairActivities;
  assert(
    allowed({ x: 28, z: 0 }) && allowed({ x: 32, z: 0 }),
    "East gate approach must be clear",
  );
  for (const spot of [
    park.arrival,
    park.ferrisBoard,
    park.carouselBoard,
    park.tossSpot,
    park.returnGate.position,
  ]) {
    assert(
      park.contains(spot.x, spot.z) && allowed(spot, park.blockers),
      "Every arrival, activity and exit must be walkable",
    );
  }
  assert(
    !park.contains(NaN, 0) && !park.contains(38, 0),
    "Park edge must contain both characters",
  );
  G.hero.position.set(32, 0, 0);
  for (let i = 0; i < 40; i++) G.frame();
  assert(
    G.insideFunfair && park.group.visible && !G.garden.visible,
    "Walking through the east gate must open the park",
  );
  assert(G.companion.character.parent === park.group && !G.held.visible);
  assert.equal(element("#funfairCounts").hidden, false);
  assert.equal(element("#gardenCounts").hidden, true);
  assert(G.hero.position.distanceTo(park.arrival) < 0.01);
  const axeCount = G.axes.length;
  G.fire();
  assert.equal(
    G.axes.length,
    axeCount,
    "Park activities must suppress axe throwing",
  );
  // Walking against a park obstacle must be resolved by the park terrain.
  G.hero.position.set(15, 0, 0.5);
  G.keys.KeyW = true;
  for (let i = 0; i < 20; i++) G.frame();
  G.keys.KeyW = false;
  assert(allowed(G.hero.position, park.blockers));
  G.hero.position.copy(park.ferrisBoard);
  G.interactFunfair();
  assert(fair.riding && fair.ride === "ferris");
  const cabinStart = G.hero.position.clone();
  G.keys.KeyW = true;
  for (let i = 0; i < 280; i++) G.frame();
  G.keys.KeyW = false;
  assert(
    G.hero.position.y > 17,
    "Wheel must lift both characters above the park",
  );
  assert(
    G.companion.character.position.y > 17 &&
      G.hero.position.distanceTo(G.companion.character.position) < 1.5,
  );
  assert(G.legs[0].rotation.x < -1 && G.companion.rig.legs[0].rotation.x < -1);
  assert(G.hero.position.distanceTo(cabinStart) > 10);
  const pausePosition = G.hero.position.clone();
  element("#guide").open = true;
  for (let i = 0; i < 30; i++) G.frame();
  assert(
    G.hero.position.distanceTo(pausePosition) < 1e-7,
    "Help must pause the ride",
  );
  element("#guide").open = false;
  for (let i = 0; i < 325; i++) G.frame();
  assert(
    !fair.riding && G.hero.position.distanceTo(park.ferrisBoard) < 0.01,
    "Full wheel circuit must return to the boarding platform",
  );
  assert(
    allowed(G.hero.position, park.blockers) &&
      allowed(G.companion.character.position, park.blockers),
  );
  G.hero.position.copy(park.carouselBoard);
  G.interactFunfair();
  assert(fair.riding && fair.ride === "carousel");
  const carouselStart = G.hero.position.clone();
  G.frame();
  assert(
    G.hero.position.x < carouselStart.x && G.hero.position.z > -7,
    "From above, the south carousel mount must move west for clockwise rotation",
  );
  for (let i = 0; i < 99; i++) G.frame();
  assert(
    Math.hypot(G.hero.position.x - 15, G.hero.position.z + 7) > 3,
    "Carousel rider must orbit the center",
  );
  assert(G.hero.position.distanceTo(G.companion.character.position) < 4);
  G.interactFunfair();
  assert(
    !fair.riding && G.hero.position.distanceTo(park.carouselBoard) < 0.01,
    "Early finish must return to safe steps",
  );
  assert(allowed(G.hero.position, park.blockers));
  G.hero.position.copy(park.tossSpot);
  const parkView = { yaw: G.yaw, pitch: G.pitch, zoom: G.zoom };
  G.interactFunfair();
  assert(fair.aiming && fair.playing);
  const tossPlayer = G.hero.position.clone(),
    tossFriend = G.companion.character.position.clone();
  G.keys.KeyW = G.keys.KeyQ = G.keys.KeyR = true;
  for (let i = 0; i < 4; i++) G.frame();
  G.keys.KeyW = G.keys.KeyQ = G.keys.KeyR = false;
  assert(
    G.hero.position.equals(tossPlayer) &&
      G.companion.character.position.equals(tossFriend),
    "First-person booth must lock both characters in place",
  );
  assert.equal(G.yaw, parkView.yaw);
  assert.equal(G.pitch, parkView.pitch);
  assert.equal(G.zoom, parkView.zoom);
  assert(
    G.renderer.scene === park.tossScene &&
      G.renderer.camera === park.tossCamera,
    "Active booth must render its separate scene and first-person camera",
  );
  assert(
    park.tossCamera.position.distanceTo(park.tossSpot) < 2.3,
    "Camera must be at eye level at the throwing position",
  );
  assert(
    !park.tossScene.getObjectById(G.hero.id) &&
      !park.tossScene.getObjectByName("ferris-wheel"),
  );
  assert(
    park.tossRing.visible && park.tossRing.position.equals(park.ring.position),
  );
  assert.equal(element("#funfairExit").hidden, false);
  G.frame();
  assert.equal(element("#ringMeter").hidden, false);
  const frozenAim = fair.aim;
  element("#guide").open = true;
  for (let i = 0; i < 8; i++) G.frame();
  assert.equal(fair.aim, frozenAim, "Help must pause first-person aiming");
  element("#guide").open = false;
  handlers.get("keydown")({
    code: "Space",
    repeat: false,
    preventDefault() {},
  }); // First target is left; center throw misses.
  assert(fair.throwing && !fair.aiming);
  G.interactFunfair(); // Repeated input during flight must not launch another ring.
  for (let i = 0; i < 26; i++) G.frame();
  assert.equal(fair.collected, 0, "Mistimed throw must not award a prize");
  assert(
    !park.ring.visible && fair.playing,
    "Miss must allow a retry inside the booth",
  );
  G.interactFunfair();
  G.interactFunfair();
  assert(fair.throwing);
  element("#funfairExit").onclick();
  for (let i = 0; i < 26; i++) G.frame();
  assert(
    !fair.playing &&
      !fair.throwing &&
      !park.tossRing.visible &&
      fair.collected === 0,
    "Leaving mid-throw must cancel the ring and reward",
  );
  assert(G.renderer.scene === G.scene && G.renderer.camera === G.camera);
  assert.equal(G.yaw, parkView.yaw);
  assert.equal(G.pitch, parkView.pitch);
  assert.equal(G.zoom, parkView.zoom);
  G.interactFunfair();
  handlers.get("keydown")({
    code: "Escape",
    repeat: false,
    preventDefault() {},
  });
  G.frame();
  assert(
    !fair.playing && element("#funfairExit").hidden,
    "Escape must leave the booth",
  );
  for (let prize = 0; prize < 3; prize++) {
    G.hero.position.copy(park.tossSpot);
    G.interactFunfair();
    for (let i = 0; i < 100 && Math.abs(fair.aim - fair.target) > 0.1; i++)
      G.frame();
    assert(Math.abs(fair.aim - fair.target) <= 0.1);
    G.interactFunfair();
    for (let i = 0; i < 26; i++) G.frame();
    assert.equal(fair.collected, prize + 1);
    assert.equal(element("#funfairPrizes").textContent, prize + 1);
    assert(!park.prizes[prize].visible);
    assert(
      !park.tossScene.getObjectByName(park.prizes[prize].name).visible,
      "Both scenes must show the same prize progress",
    );
  }
  G.interactFunfair();
  assert(
    !fair.aiming && !fair.playing && fair.collected === 3,
    "Completed booth must not award duplicate prizes",
  );
  G.hero.position.copy(park.returnGate.position);
  for (let i = 0; i < 12; i++) G.frame();
  assert(
    !G.insideFunfair &&
      G.garden.visible &&
      !park.group.visible &&
      G.held.visible,
    "Return gate must restore garden and axe",
  );
  assert(G.hero.position.distanceTo(new T.Vector3(28, 0, 0)) < 0.01);
  assert(G.companion.character.parent === G.garden);
  G.useFunfairPassage(true);
  for (let i = 0; i < 12; i++) G.frame();
  assert.equal(fair.collected, 3, "Prizes must persist across park visits");
  G.hero.position.copy(park.ferrisBoard);
  G.interactFunfair();
  for (let i = 0; i < 100; i++) G.frame();
  element("#restart").onclick();
  G.frame();
  assert(
    !G.insideFunfair && !fair.riding && !park.group.visible && G.held.visible,
  );
  assert.equal(fair.collected, 0, "New adventure must reset prizes");
  assert(park.prizes.every((p) => p.visible));
  assert.equal(G.legs[0].rotation.x, 0);
  assert.equal(G.companion.rig.legs[0].rotation.x, 0);
  G.useFunfairPassage(true);
  element("#restart").onclick();
  for (let i = 0; i < 12; i++) G.frame();
  assert(
    !G.insideFunfair && !G.passageTransition.active,
    "Restart must cancel pending park transition",
  );
  G.useFunfairPassage(true);
  for (let i = 0; i < 12; i++) G.frame();
  G.hero.position.copy(park.tossSpot);
  G.interactFunfair();
  G.interactFunfair();
  element("#restart").onclick();
  for (let i = 0; i < 30; i++) G.frame();
  assert(
    !fair.throwing &&
      !fair.playing &&
      !park.ring.visible &&
      !park.tossRing.visible &&
      fair.collected === 0,
    "Restart during a throw must cancel its reward",
  );
  console.log(
    "PASS: east funfair gate, separate scene and companion, clear activity approaches, park collisions, full Ferris circuit with seated riders, paused rides, clockwise carousel orbit and early exit, dedicated first-person booth, movement and camera locks, paused aiming, Space throws, booth exit and Escape cancellation, shared prize visuals, ring-toss misses and three timed prizes, duplicate prevention, return gate, progress persistence, and restart during rides, throws and transitions",
  );
  // The Swiss village is a separate terrain with shops, sheep and a real climb.
  const village = G.village;
  assert.equal(village.sheep.length, 8);
  assert.equal(village.shops.length, 3);
  assert(
    village.lookout.y >= 40,
    "The ferrata must climb into the mountain range",
  );
  assert(
    village.route.reduce(
      (distance, p, i) =>
        distance + (i ? p.distanceTo(village.route[i - 1]) : 0),
      0,
    ) > 125,
  );
  assert(village.ladders.length > 25, "Steep climbs need usable iron rungs");
  assert(
    village.cliffFaces.some((face) => {
      const positions = face.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++)
        if (positions.getY(i) > village.lookout.y + 20) return true;
      return false;
    }),
    "The mountain must rise above the trail, not just support it from below",
  );
  const nature = village.nature;
  assert.equal(nature.trees.length, 3600);
  assert.equal(
    nature.forest.children.length,
    8,
    "The dense forest must use instanced batches",
  );
  assert.deepEqual(Array.from(nature.forest.userData.varieties).sort(), [
    "birch",
    "fir",
    "pine",
    "spruce",
  ]);
  const sizes = nature.trees.map((tree) => tree.size);
  assert(
    Math.max(...sizes) / Math.min(...sizes) > 4,
    "The forest needs saplings and tall trees",
  );
  assert(
    nature.trees.filter((tree) => tree.site.y > 30).length > 300,
    "Trees must cover the higher mountain slopes as well as the valley",
  );
  village.group.updateWorldMatrix(true, true);
  const natureRay = new T.Raycaster();
  for (let i = 0; i < nature.trees.length; i += 23) {
    const tree = nature.trees[i];
    natureRay.set(
      new T.Vector3(tree.site.x, 150, tree.site.z),
      new T.Vector3(0, -1, 0),
    );
    const ground = natureRay.intersectObjects(nature.surfaces, false)[0];
    assert(
      ground && Math.abs(ground.point.y - tree.site.y) < 1e-5,
      "Tree roots must follow the visible mountain surface",
    );
    assert(tree.site.y <= 55, "The snowy summits must stay above the forest");
    const distance = Math.min(
      ...village.route.slice(0, -1).map((a, i) => {
        const b = village.route[i + 1],
          dx = b.x - a.x,
          dz = b.z - a.z;
        const t = T.MathUtils.clamp(
          ((tree.site.x - a.x) * dx + (tree.site.z - a.z) * dz) /
            (dx * dx + dz * dz),
          0,
          1,
        );
        return Math.hypot(
          tree.site.x - a.x - t * dx,
          tree.site.z - a.z - t * dz,
        );
      }),
    );
    assert(
      distance > 4.3 + tree.width / 1.12,
      "Trees must leave the hiking route clear",
    );
  }
  assert(
    nature.grass.userData.tuftCount >= 18000,
    "Mountain meadows need dense grass, including planted trunk bases",
  );
  assert.equal(nature.grassCovers.length, nature.grassSurfaces.length);
  for (let i = 0; i < nature.grassSites.length; i += 97) {
    const plant = nature.grassSites[i];
    natureRay.set(
      plant.site.clone().addScaledVector(plant.normal, 0.5),
      plant.normal.clone().negate(),
    );
    natureRay.far = 0.6;
    const ground = natureRay.intersectObject(plant.source, false)[0];
    assert(
      ground && ground.point.distanceTo(plant.site) < 1e-4,
      "Grass must remain attached to its supporting slope or meadow",
    );
    natureRay.far = Infinity;
  }
  for (const tree of nature.trees)
    assert(
      Math.abs(tree.matrix.elements[13] - (tree.site.y - tree.rootDepth)) <
        1e-5,
      "Trunk bases must sit in the planted ground",
    );
  assert(
    nature.grassSites.filter((plant) => plant.normal.y < 0.1).length > 300,
    "Bare mountain end faces must also have attached grass",
  );
  assert(
    nature.grassSites.some(
      (plant) =>
        plant.source.name === "alpine-village-ground" && plant.site.z > 14,
    ),
    "The open village lawns need grass",
  );
  assert(
    nature.grassSites.some(
      (plant) => plant.source.name === "alpine-valley-ground",
    ),
    "The valley floor needs grass",
  );
  assert(
    nature.grassSites.some((plant) => plant.source.userData.side === -1) &&
      nature.grassSites.some((plant) => plant.source.userData.side === 1),
    "Both sides of the stream need planted banks",
  );
  const stream = village.ravine.children.filter(
    (mesh) => mesh.name === "ravine-stream-water",
  );
  assert(
    stream.length > 5 && village.ravineBanks.length > 1,
    "The bridge gap must lead into a continuous stream ravine",
  );
  for (const water of stream)
    assert(
      new T.Box3().setFromObject(water).max.y <
        village.route[village.bridgeSegment].y - 10,
      "The stream must stay well below the walkable bridge",
    );
  assert.equal(nature.birds.length, 12);
  assert.equal(
    nature.birdGroup.children.length,
    3,
    "Flying flocks must share instanced drawing batches",
  );
  const birdStart = nature.birds[0].position.clone(),
    firstFlap = nature.birds[0].flap;
  nature.update(2);
  assert(
    nature.birds[0].position.distanceTo(birdStart) > 1 &&
      nature.birds[0].flap !== firstFlap,
    "Birds must fly and flap their wings",
  );
  for (let step = 0; step < 24; step++) {
    nature.update(8);
    for (const bird of nature.birds) {
      assert(bird.position.toArray().every(Number.isFinite));
      natureRay.set(
        new T.Vector3(bird.position.x, 150, bird.position.z),
        new T.Vector3(0, -1, 0),
      );
      const ground = natureRay.intersectObjects(nature.surfaces, false)[0];
      assert(
        !ground || bird.position.y > ground.point.y + 3,
        "Flying birds must remain above the mountain rock",
      );
    }
  }
  const treeCamera = new T.PerspectiveCamera(60, 1, 0.1, 200);
  const testTree = nature.trees[0],
    treeHiker = new T.Group();
  treeCamera.position.set(
    testTree.site.x,
    testTree.site.y + testTree.height * 0.5,
    testTree.site.z + 9,
  );
  treeHiker.position.set(
    testTree.site.x,
    testTree.site.y + testTree.height * 0.5 - 1.6,
    testTree.site.z - 9,
  );
  nature.updateVisibility(treeCamera, [treeHiker]);
  assert(testTree.hidden, "A forest tree must not conceal a hiker");
  const treeMatrix = new T.Matrix4();
  testTree.crowns.getMatrixAt(testTree.index, treeMatrix);
  assert(
    treeMatrix.determinant() === 0,
    "Occluding tree geometry and shadows must be hidden",
  );
  treeCamera.position.x += 300;
  treeHiker.position.x += 300;
  nature.updateVisibility(treeCamera, [treeHiker]);
  assert(!testTree.hidden, "The tree must reappear after the camera clears it");
  const sourceOpacity = testTree.groundSurface.material.opacity;
  testTree.groundSurface.material.opacity = 0.035;
  nature.updateVisibility(treeCamera, [treeHiker]);
  assert(
    testTree.hidden,
    "Trees must disappear with faded supporting rock instead of floating in the air",
  );
  const fadedMeadow = nature.grassCovers.find(
    (patch) => patch.source === testTree.groundSurface,
  );
  assert(
    !fadedMeadow.mesh.visible,
    "Meadow cover must follow its supporting rock visibility",
  );
  testTree.groundSurface.material.opacity = sourceOpacity;
  nature.updateVisibility(treeCamera, [treeHiker]);
  assert(
    !testTree.hidden && fadedMeadow.mesh.visible,
    "Trees and grass must reappear with opaque terrain",
  );
  // Every rock chunk is a closed, consistently wound volume with a base on
  // the valley floor. Open ends or inverted facets create the floating sheets.
  for (const rock of village.cliffFaces) {
    const vertices = rock.geometry.getAttribute("position"),
      indices = rock.geometry.index;
    const edges = new Map();
    let volume = 0,
      groundVertices = 0;
    const point = (index) =>
      new T.Vector3().fromBufferAttribute(vertices, index);
    for (let i = 0; i < vertices.count; i++)
      if (vertices.getY(i) === -5) groundVertices++;
    for (let i = 0; i < indices.count; i += 3) {
      const triangle = [
        indices.getX(i),
        indices.getX(i + 1),
        indices.getX(i + 2),
      ];
      volume +=
        point(triangle[0]).dot(point(triangle[1]).cross(point(triangle[2]))) /
        6;
      for (let j = 0; j < 3; j++) {
        const u = triangle[j],
          v = triangle[(j + 1) % 3],
          key = `${Math.min(u, v)}:${Math.max(u, v)}`;
        const edge = edges.get(key) ?? { count: 0, direction: 0 };
        edge.count++;
        edge.direction += u < v ? 1 : -1;
        edges.set(key, edge);
      }
    }
    assert(
      groundVertices >= 4 && volume > 500,
      "Mountain chunks must have grounded bases and solid volume",
    );
    for (const edge of edges.values())
      assert(
        edge.count === 2 && edge.direction === 0,
        "Every edge must join two consistently wound rock faces",
      );
  }
  const visibilityCamera = new T.PerspectiveCamera(60, 1, 0.1, 200);
  const hikers = [new T.Group(), new T.Group()];
  hikers[0].position.copy(village.route[9]);
  hikers[1].position.copy(village.route[10]);
  visibilityCamera.position.set(17, 50, -72);
  visibilityCamera.lookAt(hikers[0].position);
  visibilityCamera.updateMatrixWorld(true);
  village.group.updateWorldMatrix(true, true);
  const raycaster = new T.Raycaster();
  const occluders = new Set();
  for (const hiker of hikers) {
    const head = hiker.position.clone().add(new T.Vector3(0, 1.6, 0));
    raycaster.set(
      visibilityCamera.position,
      head.clone().sub(visibilityCamera.position).normalize(),
    );
    raycaster.far = head.distanceTo(visibilityCamera.position);
    for (const hit of raycaster.intersectObjects(village.cliffFaces, false))
      occluders.add(hit.object);
  }
  assert(
    occluders.size > 0,
    "The regression camera must start behind obstructing rock",
  );
  village.updateVisibility(visibilityCamera, hikers, 1);
  for (const rock of occluders)
    assert(
      rock.material.opacity < 0.05 && !rock.material.depthWrite,
      "Rock in front of either hiker must stop concealing them",
    );
  const insideRock = village.cliffFaces[7];
  const rockBounds = new T.Box3().setFromObject(insideRock);
  visibilityCamera.position.copy(rockBounds.getCenter(new T.Vector3()));
  visibilityCamera.lookAt(hikers[0].position);
  visibilityCamera.updateMatrixWorld(true);
  village.updateVisibility(visibilityCamera, hikers, 1);
  assert(
    insideRock.material.opacity < 0.05,
    "A camera entering the mountain must still reveal the hikers",
  );
  visibilityCamera.position.set(60, 50, 80);
  visibilityCamera.lookAt(hikers[0].position);
  visibilityCamera.updateMatrixWorld(true);
  village.updateVisibility(visibilityCamera, hikers, 1);
  for (const rock of village.cliffFaces)
    assert(
      rock.material.opacity === 1 && rock.material.depthWrite,
      "Rock must become opaque again when the camera clears it",
    );
  assert(
    allowed({ x: 0, z: 33 }) && allowed({ x: 0, z: 28 }),
    "Garden south gate and return landing must be clear",
  );
  for (const shop of village.shops)
    assert(allowed(shop.doorway, village.blockers));
  G.hero.position.set(0, 0, 33);
  for (let i = 0; i < 40; i++) G.frame();
  assert(G.insideVillage && village.group.visible && !G.garden.visible);
  assert(G.companion.character.parent === village.group);
  assert.equal(element("#villageCounts").hidden, false);
  assert(!G.held.visible && G.camera.fov === 60);
  G.fire();
  assert.equal(G.axes.length, 0);
  const villageCamera = {
    yaw: G.yaw,
    pitch: G.pitch,
    zoom: G.zoom,
    fov: G.camera.fov,
  };
  for (const shop of village.shops) {
    G.hero.position.copy(shop.doorway);
    G.interactVillage();
    assert(
      G.passageTransition.active,
      "Entering a chalet must use the scene fade",
    );
    for (let i = 0; i < 12; i++) G.frame();
    assert(
      G.activeVillageShop === shop &&
        shop.room.group.visible &&
        !village.group.visible,
    );
    assert(G.companion.character.parent === shop.room.group);
    assert(shop.room.contains(G.hero.position.x, G.hero.position.z));
    G.hero.position.set(0, 0, -1.1);
    G.interactVillage();
    assert(village.stamps.has(shop.kind));
    for (let i = 0; i < 30; i++) G.frame();
    G.interactVillage();
    assert.equal(
      village.stamps.size,
      village.shops.indexOf(shop) + 1,
      "Shop souvenirs must not count twice",
    );
    G.hero.position.set(0, 0, 6);
    for (let i = 0; i < 12; i++) G.frame();
    assert(
      !G.activeVillageShop && village.group.visible && !shop.room.group.visible,
    );
    assert(G.companion.character.parent === village.group);
    assert(allowed(G.hero.position, village.blockers));
    assert.equal(G.camera.fov, villageCamera.fov);
  }
  assert(G.alpineOutfits.scarves.every((scarf) => scarf.visible));
  assert(G.alpineOutfits.bouquet.visible);
  const firstSheep = village.sheep[0];
  G.hero.position.copy(firstSheep.group.position).add(new T.Vector3(0, 0, 1.7));
  for (let i = 0; i < 22; i++) G.frame();
  G.interactVillage();
  assert(firstSheep.petTime > 0 && village.stamps.has("sheep"));
  for (let i = 0; i < 100; i++) village.update(0.04, i * 0.04, G.hero.position);
  for (const sheep of village.sheep) {
    assert(sheep.group.position.x > 20 && sheep.group.position.x < 35);
    assert(sheep.group.position.z > 15 && sheep.group.position.z < 27);
    assert(Number.isFinite(sheep.head.rotation.x));
  }
  G.hero.position.copy(village.returnGate.position);
  for (let i = 0; i < 12; i++) G.frame();
  assert(
    !G.insideVillage &&
      !village.group.visible &&
      G.garden.visible &&
      G.held.visible,
    "Village return gate must restore the garden",
  );
  assert.equal(G.camera.fov, 43);
  assert.equal(
    village.stamps.size,
    4,
    "Village memories must persist between visits",
  );
  G.useVillagePassage(true);
  for (let i = 0; i < 12; i++) G.frame();
  G.hero.position.set(-30, 0, -6);
  G.companion.reset(G.hero.position, village.blockers, village);
  // Walk each segment through the real movement loop, including the bridge.
  for (const waypoint of village.route.slice(1)) {
    let frames = 0;
    while (
      Math.hypot(
        G.hero.position.x - waypoint.x,
        G.hero.position.z - waypoint.z,
      ) > 0.3 &&
      frames++ < 180
    ) {
      G.keys.KeyD = waypoint.x - G.hero.position.x > 0.15;
      G.keys.KeyA = waypoint.x - G.hero.position.x < -0.15;
      G.keys.KeyS = waypoint.z - G.hero.position.z > 0.15;
      G.keys.KeyW = waypoint.z - G.hero.position.z < -0.15;
      G.frame();
      assert(
        village.contains(G.hero.position.x, G.hero.position.z),
        "Hikers must stay on the trail",
      );
      assert(Number.isFinite(G.companion.character.position.y));
      assert(
        village.contains(
          G.companion.character.position.x,
          G.companion.character.position.z,
        ),
        "The companion must stay on the mountain ledges",
      );
    }
    G.keys.KeyD = G.keys.KeyA = G.keys.KeyS = G.keys.KeyW = false;
    assert(
      frames < 180,
      `Walk to ${waypoint.toArray()} stalled at ${G.hero.position.toArray()} with companion ${G.companion.character.position.toArray()}`,
    );
    assert(
      Math.abs(G.hero.position.y - waypoint.y) < 0.4,
      `Height at ${waypoint.toArray()}: ${G.hero.position.toArray()}`,
    );
  }
  assert(
    G.hero.position.y > 42.9 &&
      G.alpineOutfits.harnesses.every((h) => h.visible),
  );
  G.frame();
  const savedHikeCamera = { yaw: G.yaw, pitch: G.pitch, zoom: G.zoom };
  G.interactVillage();
  assert(G.alpineCart.riding && village.stamps.size === 4);
  assert.equal(G.camera.fov, 48);
  assert(G.arms.every((arm) => arm.rotation.x < -2));
  assert(G.legs.every((leg) => Math.abs(leg.rotation.x + Math.PI / 2) < 1e-6));
  assert(G.body.getObjectByName("cart-excited-face").visible);
  assert(G.companion.rig.body.getObjectByName("cart-excited-face").visible);
  assert(G.eyes.open.visible && !G.eyes.closed.visible);
  G.keys.KeyW = G.keys.KeyQ = true;
  for (let i = 0; i < 30; i++) G.frame();
  assert(G.alpineCart.progress > 0 && G.hero.position.y > 40);
  assert.equal(
    G.yaw,
    savedHikeCamera.yaw,
    "Camera keys must not rotate the ride shot",
  );
  assert(G.camera.position.distanceTo(G.alpineCart.cart.position) < 9);
  const pausedProgress = G.alpineCart.progress;
  element("#guide").open = true;
  for (let i = 0; i < 20; i++) G.frame();
  assert.equal(G.alpineCart.progress, pausedProgress);
  element("#guide").open = false;
  let rideFrames = 0;
  while (G.alpineCart.riding && rideFrames++ < 650) {
    G.frame();
    assert(
      village.contains(
        G.alpineCart.cart.position.x,
        G.alpineCart.cart.position.z,
      ),
      "The cart must stay on the mountain route",
    );
    assert(G.hero.position.distanceTo(G.companion.character.position) < 3);
  }
  assert(
    rideFrames < 650 && !G.alpineCart.riding && !G.keys.KeyW && !G.keys.KeyQ,
  );
  assert.equal(village.stamps.size, 5);
  assert.equal(G.hero.position.y, 0);
  assert(G.hero.position.z > -7);
  assert(!G.body.getObjectByName("cart-excited-face").visible);
  assert(!G.companion.rig.body.getObjectByName("cart-excited-face").visible);
  assert(
    G.alpineOutfits.bouquet.visible &&
      G.alpineOutfits.scarves.every((scarf) => scarf.visible),
  );
  assert.equal(G.camera.fov, villageCamera.fov);
  assert.equal(G.yaw, savedHikeCamera.yaw);
  assert.equal(G.pitch, savedHikeCamera.pitch);
  assert.equal(G.zoom, savedHikeCamera.zoom);
  assert(G.alpineCart.vanishing, "Magic begins after both riders disembark");
  const landingPosition = G.hero.position.clone();
  for (let i = 0; i < 12; i++) G.frame();
  assert(G.alpineCart.cart.scale.x < 0.5);
  assert(G.alpineCart.magic.children.some((sparkle) => sparkle.scale.x > 0));
  const pausedShrink = G.alpineCart.cart.scale.x;
  element("#guide").open = true;
  for (let i = 0; i < 20; i++) G.frame();
  assert.equal(G.alpineCart.cart.scale.x, pausedShrink);
  element("#guide").open = false;
  for (let i = 0; i < 60; i++) G.frame();
  assert(
    !G.alpineCart.cart.visible && !G.alpineCart.vanishing,
    "The cart and magic clear the path",
  );
  assert(G.hero.position.equals(landingPosition));
  assert.equal(village.stamps.size, 5);
  assert(
    G.camera.position.distanceTo(G.hero.position) > 30,
    "Normal walking camera resumes after the magic",
  );
  G.hero.position.copy(village.lookout);
  G.companion.reset(G.hero.position, village.blockers, village);
  // Descend the entire mountain route using the same real keyboard movement.
  for (const waypoint of village.route.slice(0, -1).reverse()) {
    let frames = 0;
    while (
      Math.hypot(
        G.hero.position.x - waypoint.x,
        G.hero.position.z - waypoint.z,
      ) > 0.3 &&
      frames++ < 200
    ) {
      G.keys.KeyD = waypoint.x - G.hero.position.x > 0.15;
      G.keys.KeyA = waypoint.x - G.hero.position.x < -0.15;
      G.keys.KeyS = waypoint.z - G.hero.position.z > 0.15;
      G.keys.KeyW = waypoint.z - G.hero.position.z < -0.15;
      G.frame();
      assert(village.contains(G.hero.position.x, G.hero.position.z));
    }
    G.keys.KeyD = G.keys.KeyA = G.keys.KeyS = G.keys.KeyW = false;
    assert(
      frames < 200,
      `Descent to ${waypoint.toArray()} stalled at ${G.hero.position.toArray()}, companion ${G.companion.character.position.toArray()}`,
    );
  }
  assert.equal(
    G.body.rotation.x,
    0,
    "The hiking pose must clear on the approach path",
  );
  // The bridge edge blocks stepping into the gorge.
  const bridgeCenter = village.route[village.bridgeSegment]
    .clone()
    .lerp(village.route[village.bridgeSegment + 1], 0.5);
  G.hero.position.copy(bridgeCenter);
  G.companion.reset(G.hero.position, village.blockers, village);
  G.keys.KeyW = true;
  for (let i = 0; i < 30; i++) G.frame();
  G.keys.KeyW = false;
  assert(
    G.hero.position.z > bridgeCenter.z - 1.3 &&
      G.hero.position.y === bridgeCenter.y,
  );
  G.useVillageShop(village.shops[0]);
  for (let i = 0; i < 12; i++) G.frame();
  element("#restart").onclick();
  G.frame();
  assert(!G.insideVillage && !G.activeVillageShop && !G.alpineCart.riding);
  assert(village.shops.every((shop) => !shop.room.group.visible));
  assert.equal(village.stamps.size, 0);
  assert(G.alpineOutfits.harnesses.every((h) => !h.visible));
  assert(
    G.alpineOutfits.scarves.every((scarf) => !scarf.visible) &&
      !G.alpineOutfits.bouquet.visible,
  );
  assert(G.garden.visible && G.held.visible && G.camera.fov === 43);
  G.useVillagePassage(true, "lookout");
  for (let i = 0; i < 30; i++) G.frame();
  G.interactVillage();
  for (let i = 0; i < 100; i++) G.frame();
  assert(G.alpineCart.riding);
  element("#restart").onclick();
  G.frame();
  assert(!G.alpineCart.riding && !G.insideVillage && G.camera.fov === 43);
  assert(!G.body.getObjectByName("cart-excited-face").visible);
  assert.equal(G.body.rotation.x, 0);
  assert.equal(G.hero.rotation.x, 0);
  assert.equal(village.stamps.size, 0);
  G.useVillagePassage(true);
  element("#restart").onclick();
  for (let i = 0; i < 12; i++) G.frame();
  assert(!G.insideVillage && !G.passageTransition.active);
  console.log(
    "PASS: Swiss village gate and return, three accessible chalet interiors and shop activities, persistent souvenirs, eight pettable sheep contained in their meadow, walking every elevated trail segment, solid closed mountains and grounded foothills, 3600 varied grounded trees with a clear hiking route, 12 pale birds gliding above the rock, grounded meadow grass on cliff ends, village lawns and valley floor, tapered stream ravine below the bridge, planted trunk bases, forest camera clearance and synchronized rock/forest visibility, rock fading for both hikers and cameras inside the mountain, companion harnesses, cable bridge boundary, two seated excited cart riders, full rail descent, flower-and-star disappearance and paused magic, paused ride, close camera and input lock, camera restoration, and restart inside shops and transitions",
  );
  // Festival entry follows the fair, and preserves the garden's saved view.
  G.useFunfairPassage(true);
  for (let i = 0; i < 12; i++) G.frame();
  G.hero.position.set(0, 0, -27);
  for (let i = 0; i < 40; i++) G.frame();
  assert(G.insideFestival && !G.insideFunfair);
  assert(
    G.festival.group.visible && !G.funfair.group.visible && !G.garden.visible,
  );
  assert(!G.held.visible);
  assert(G.body.getObjectByName("summer-t-shirt").visible);
  assert(G.companion.rig.body.getObjectByName("summer-t-shirt").visible);
  for (let z = 23; z > -29; z -= 0.2) {
    assert(
      G.festival.contains(0, z),
      "Street and bridge form a continuous walkable route",
    );
    assert(
      allowed({ x: 0, z }, G.festival.blockers),
      "Central route must remain clear",
    );
  }
  assert(
    !G.festival.contains(8, -6),
    "River banks cannot be crossed away from the bridge",
  );
  assert(!G.festival.contains(NaN, 0));
  const riverWater = G.festival.group.getObjectByName("festival-river-water");
  // A downward ray must reach visible water, rather than a ground or path slab.
  G.festival.group.updateWorldMatrix(true, true);
  const festivalBuildings = G.festival.group.children.filter(
    (child) =>
      child.name === "festival-street-house" ||
      child.name === "riverside-tea-house",
  );
  assert.equal(festivalBuildings.length, 9);
  for (const building of festivalBuildings) {
    const bounds = new T.Box3().setFromObject(building);
    assert(
      bounds.min.z >= -1.3 || bounds.max.z <= -10.7,
      "Buildings and their roof overhangs must be entirely on dry banks",
    );
  }
  const waterRay = new T.Raycaster(
    new T.Vector3(5, 10, -6),
    new T.Vector3(0, -1, 0),
  );
  const waterHits = waterRay.intersectObjects(G.festival.group.children, true);
  assert.equal(
    waterHits[0].object,
    riverWater,
    "Ground and paths must leave the river channel exposed",
  );
  assert.equal(
    G.festival.group.getObjectByName("sakura-riverbanks").userData.treeCount,
    20,
  );
  assert.equal(
    G.festival.group.getObjectByName("dense-sakura-blossoms").count,
    460,
  );
  assert.equal(
    G.festival.group.getObjectByName("drifting-sakura-petals").count,
    160,
  );
  const festivalFireworks =
    G.festival.group.getObjectByName("festival-fireworks");
  const waterReflection = G.festival.group.getObjectByName(
    "fireworks-water-reflection",
  );
  G.festival.restartFireworks();
  G.festival.update(0);
  assert(!festivalFireworks.visible, "Quiet sky between displays");
  G.festival.update(5.2);
  assert(festivalFireworks.visible && waterReflection.visible);
  assert(
    Array.from(festivalFireworks.geometry.attributes.position.array).every(
      Number.isFinite,
    ),
  );
  assert(
    Array.from(waterReflection.geometry.attributes.position.array).every(
      Number.isFinite,
    ),
  );
  G.festival.update(5);
  assert(
    !festivalFireworks.visible && !waterReflection.visible,
    "Each bloom fades before the next launch",
  );
  assert(G.festival.heightAt(0, -6) > 0.5);
  G.hero.position.set(0, G.festival.heightAt(0, -6), -6);
  G.frame();
  assert(
    G.festivalMoment.active,
    "Arriving on the bridge starts the moment automatically",
  );
  const pairPositions = [
    G.hero.position.clone(),
    G.companion.character.position.clone(),
  ];
  assert(
    Math.cos(G.hero.rotation.y) < -0.9 &&
      Math.cos(G.companion.character.rotation.y) < -0.9,
    "Both characters face the fireworks to the north",
  );
  assert(G.body.getObjectByName("festival-upturned-head").rotation.x < -0.25);
  assert(G.body.getObjectByName("festival-amazed-mouth").visible);
  const giant = G.festival.group.getObjectByName("gigantic-firework-trails");
  G.festival.restartFireworks();
  G.festival.update(6);
  giant.geometry.computeBoundingBox();
  assert(
    giant.geometry.boundingBox.max.x - giant.geometry.boundingBox.min.x > 50,
    "Bouquet spans the skyline",
  );
  const closeCamera = G.camera.position.clone();
  G.keys.KeyW = true;
  for (let i = 0; i < 20; i++) G.frame();
  assert(
    G.hero.position.equals(pairPositions[0]) &&
      G.companion.character.position.equals(pairPositions[1]),
  );
  const pausedCamera = G.camera.position.clone();
  element("#guide").open = true;
  for (let i = 0; i < 100; i++) G.frame();
  assert(G.camera.position.equals(pausedCamera), "Help pauses the cinematic");
  element("#guide").open = false;
  G.keys.KeyW = false;
  for (let i = 0; i < 200; i++) G.frame();
  assert(
    G.camera.position.y > closeCamera.y && G.camera.position.z < 3,
    "Tilt clears the overhead lantern string",
  );
  G.interactFestival();
  assert(!G.festivalMoment.active);
  assert.equal(
    G.camera.fov,
    43,
    "Normal field of view restored after the reveal",
  );
  assert.equal(G.body.getObjectByName("festival-upturned-head").rotation.x, 0);
  assert(!G.body.getObjectByName("festival-amazed-mouth").visible);
  assert(G.eyes.open.parent === G.body, "Ordinary face rig restored on exit");
  G.interactFestival();
  assert(G.festivalMoment.active, "The moment can be replayed");
  G.interactFestival();
  G.hero.position.set(0, 0, 27);
  for (let i = 0; i < 40; i++) G.frame();
  assert(!G.insideFestival && G.insideFunfair && G.funfair.group.visible);
  assert(!G.body.getObjectByName("summer-t-shirt").visible);
  G.hero.position.set(0, 0, -27);
  for (let i = 0; i < 40; i++) G.frame();
  G.hero.position.set(0, G.festival.heightAt(0, -6), -6);
  G.frame();
  assert(G.festivalMoment.active);
  element("#restart").onclick();
  G.frame();
  assert(!G.insideFestival && !G.insideFunfair && !G.festivalMoment.active);
  assert(G.garden.visible && G.held.visible);
  assert(!G.body.getObjectByName("summer-t-shirt").visible);
  assert.equal(
    G.scene.children.find((c) => c.isHemisphereLight).intensity,
    2.4,
  );
  console.log(
    "PASS: festival gate from funfair and return, summer clothes for both characters, clear street and bridge, river boundaries, automatic paired happy-face moment, movement lock, paused cinematic, unobstructed fireworks tilt, replay and safe restart restoring clothes and lighting",
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
    "PASS: dimmed sleeping room, warm lamp, draped blanket with visible faces and joined hands, restored daytime lighting and bedspread, face-to-face sleeping hug, closed eyes and restored awake poses, bed rest for both characters, paused movement and animation, safe get-up and rest cleanup on exit and restart, distinct forested lagoon slope without duplicated waterfall or rainbow, clear sofa aisle for both characters, solid gold and gemstone boxes, separate castle-room entry and return transitions, reachable furniture activities and six-star treasure hunt, persistent chest reward, cable-car ascent and descent, both riders, summit landing and boundary, safe restart and preserved lagoon treasures, smooth bidirectional gate transitions, midpoint-only scene changes, duplicate prevention and restart cancellation, cave wall and exit rock coverage, sprint contacts around the chamber, reachable cave exit, garden rock clearance, garden solid blockers, reachable shrine quest, target blocker lifecycle, full gazebo seats, non-crossing bench approaches, repeated collision resolution, exact-center contacts and crowded-contact fallback",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
