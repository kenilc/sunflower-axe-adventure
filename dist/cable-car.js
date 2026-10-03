import { createSummitCastle } from "./summit-castle.js?v=20261003-great-room";
import * as THREE from "./vendor/three.module.js";

export function createCableCar({
  scene,
  riverside,
  lagoon,
  hero,
  heroRig,
  companion,
  mesh,
  box,
  cyl,
  toast,
  onArrival,
}) {
  const group = new THREE.Group();
  group.name = "mountain-cable-car";
  group.visible = false;
  scene.add(group);
  // The lagoon sees the forested rear slope of the same mountain. Copy only
  // its land and vegetation, so river effects never reappear during the ride.
  const scenery = new THREE.Group();
  scenery.name = "lagoon-mountain-backdrop";
  scenery.rotation.y = Math.PI;
  scenery.position.z = -20;
  group.add(scenery);
  const mountain = riverside.group
    .getObjectByName("waterfall-mountain")
    .clone(true);
  mountain.name = "lagoon-mountain";
  mountain.getObjectByName("waterfall-source-stream").removeFromParent();
  scenery.add(mountain);
  const sourceX = Math.sin(56 * 0.12) * 3;
  const islandDock = new THREE.Vector3(0, 0.16, -3.2);
  const summitCenter = new THREE.Vector3(-sourceX, 59, -124);
  const summitDock = summitCenter.clone().add(new THREE.Vector3(-6.2, 0.16, 0));
  const summitLanding = summitCenter
    .clone()
    .add(new THREE.Vector3(1.7, 0, 6.5));
  const islandLanding = islandDock.clone().add(new THREE.Vector3(0, -0.16, -2));
  const startPoint = islandDock.clone().add(new THREE.Vector3(0, 0.35, 0));
  const endPoint = summitDock.clone().add(new THREE.Vector3(0, 0.35, 0));
  // A grassy valley meets the lagoon shore below the rocky forest slope.
  const valley = cyl(1, 1, 3.6, "#85a777", 0, -1.84, -112, group, 96);
  valley.scale.set(68, 1, 87);
  valley.name = "cable-car-valley";
  const rockFace = new THREE.Group();
  rockFace.name = "lagoon-rocky-slope";
  mountain.add(rockFace);
  const ledges = [
    [-6.8, 4.5, 3.4, 3.6, 2.2, -0.4],
    [-1.5, 3, 4.8, 2.3, 2.1, 0.2],
    [5.8, 6.2, 3.5, 4, 2, 0.3],
    [-4.8, 11.5, 3.1, 3.8, 1.9, -0.2],
    [2.6, 13, 4.2, 2.2, 1.8, 0.1],
    [-6.3, 21, 3.5, 4.5, 1.7, 0.5],
    [0.1, 23, 4.4, 2.8, 1.9, 0.6],
    [5.8, 28, 2.8, 4.2, 1.8, -0.3],
  ];
  ledges.forEach(([x, y, width, height, depth, angle], i) => {
    const radius = 12 - (3 * y) / 32;
    // Irregular, embedded ledges break up the exposed cliff face.
    const z = 80 - 0.65 * Math.sqrt(radius * radius - x * x);
    const rock = mesh(
      new THREE.IcosahedronGeometry(1, 0),
      ["#859184", "#79877c", "#92988b"][i % 3],
      sourceX + x,
      y,
      z + 0.7,
      rockFace,
    );
    rock.scale.set(width, height, depth);
    rock.rotation.set(0.15, angle, angle * 0.45);
  });
  const summitGroup = new THREE.Group();
  summitGroup.name = "summit-lookout";
  group.add(summitGroup);
  const summit = {
    group: summitGroup,
    blockers: [],
    contains: (x, z) =>
      Math.hypot(x - summitCenter.x, z - summitCenter.z) < 8.6,
    heightAt: (x, z) =>
      summitCenter.y +
      (Math.abs(x - summitDock.x) < 2.3 && Math.abs(z - summitDock.z) < 1.4
        ? 0.16
        : 0),
  };
  cyl(
    9.6,
    9.6,
    0.4,
    "#b99364",
    summitCenter.x,
    58.8,
    summitCenter.z,
    summitGroup,
    32,
  );
  for (let i = 0; i < 32; i++) {
    const angle = (i * Math.PI * 2) / 32;
    const x = summitCenter.x + Math.cos(angle) * 9.4;
    const z = summitCenter.z + Math.sin(angle) * 9.4;
    cyl(0.075, 0.075, 1.4, "#e7c894", x, 59.65, z, summitGroup);
  }
  const rail = mesh(
    new THREE.TorusGeometry(9.4, 0.07, 5, 64),
    "#e7c894",
    summitCenter.x,
    60.3,
    summitCenter.z,
    summitGroup,
  );
  rail.rotation.x = Math.PI / 2;
  const castle = createSummitCastle({
    parent: summitGroup,
    center: summitCenter,
    blockers: summit.blockers,
    mesh,
    box,
    cyl,
  });
  summit.followDistance = 1.8;
  summit.castle = castle;
  function station(parent, dock, name) {
    const station = new THREE.Group();
    station.name = name;
    station.position.copy(dock);
    station.position.y -= 0.16;
    parent.add(station);
    box(4.6, 0.15, 2.8, "#c49e70", 0, 0.08, 0, station);
    for (const x of [-1.95, 1.95]) {
      cyl(0.12, 0.16, 4.6, "#5b655b", x, 2.3, -0.7, station);
      (parent === lagoon.group ? lagoon.blockers : summit.blockers).push({
        x: dock.x + x,
        z: dock.z - 0.7,
        r: 0.2,
        minClearance: 0.8,
      });
    }
    box(4.8, 0.2, 1.8, "#67815d", 0, 4.55, -0.7, station);
    box(1.7, 0.48, 0.12, "#d7bc84", 0, 3.85, 0.25, station);
    return station;
  }
  station(lagoon.group, islandDock, "lagoon-cable-car-station");
  station(summitGroup, summitDock, "summit-cable-car-station");
  const lagoonHeightAt = lagoon.heightAt;
  lagoon.heightAt = (x, z) =>
    Math.abs(x - islandDock.x) < 2.3 && Math.abs(z - islandDock.z) < 1.4
      ? 0.16
      : lagoonHeightAt(x, z);
  function route(t) {
    const point = startPoint.clone().lerp(endPoint, t);
    point.y -= Math.sin(t * Math.PI) * 2;
    return point;
  }
  const linePoints = [];
  for (let i = 0; i <= 80; i++)
    linePoints.push(route(i / 80).add(new THREE.Vector3(0, 4.1, 0)));
  for (const x of [-0.3, 0.3]) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      linePoints.map((p) => p.clone().add(new THREE.Vector3(x, 0, 0))),
    );
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: "#4b6059" }),
    );
    line.name = "cable-car-cable";
    group.add(line);
  }
  const cabin = new THREE.Group();
  cabin.name = "glass-cable-car";
  group.add(cabin);
  box(3.5, 0.18, 2.4, "#568d86", 0, 0, 0, cabin);
  box(3.7, 0.18, 2.6, "#e2c680", 0, 3.5, 0, cabin);
  const glass = new THREE.MeshStandardMaterial({
    color: "#b3e9df",
    transparent: true,
    opacity: 0.15,
    roughness: 0.15,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const x of [-1.7, 1.7]) {
    box(0.04, 3.1, 2.25, glass, x, 1.8, 0, cabin);
    for (const z of [-1.1, 1.1])
      box(0.08, 3.5, 0.08, "#e2c680", x, 1.75, z, cabin);
  }
  for (const z of [-1.15, 1.15]) box(3.3, 3.1, 0.04, glass, 0, 1.8, z, cabin);
  box(0.16, 0.7, 0.16, "#4b6059", 0, 3.85, 0, cabin);
  const rigs = [heroRig, companion.rig];
  const characters = [hero, companion.character];
  let enabled = false,
    riding = false,
    atSummit = false,
    elapsed = 0;
  const duration = 12;
  function showScenery() {
    summitGroup.visible = atSummit || riding;
  }
  function restorePose() {
    rigs.forEach((rig) => {
      rig.body.position.y = 0;
      rig.body.rotation.set(0, 0, 0);
      [...rig.legs, ...rig.arms].forEach((limb) => limb.rotation.set(0, 0, 0));
      rig.legs.forEach((leg) => {
        leg.children[1].rotation.x = 0;
      });
      if (rig.held) rig.held.visible = true;
    });
  }
  function nearby() {
    const dock = atSummit ? summitDock : islandDock;
    return (
      enabled &&
      !riding &&
      Math.hypot(hero.position.x - dock.x, hero.position.z - dock.z) <
        (atSummit ? 3.3 : 2.3)
    );
  }
  function positionRiders() {
    characters.forEach((character, i) => {
      character.position
        .copy(cabin.position)
        .add(new THREE.Vector3(i ? 0.78 : -0.78, 0.1, 0));
      character.rotation.y = atSummit ? 0 : Math.PI;
      if (rigs[i].held) rigs[i].held.visible = false;
    });
  }
  function start() {
    if (!nearby()) return false;
    riding = true;
    elapsed = 0;
    restorePose();
    group.add(companion.character);
    cabin.position.copy(atSummit ? endPoint : startPoint);
    positionRiders();
    showScenery();
    toast(
      atSummit
        ? "Cable car · Descending to the flower island"
        : "Cable car · Rising above the lake and treetops",
    );
    return true;
  }
  function update(dt) {
    if (!riding) return;
    elapsed = Math.min(duration, elapsed + dt);
    const t = elapsed / duration;
    const smooth = t * t * (3 - 2 * t);
    cabin.position.copy(route(atSummit ? 1 - smooth : smooth));
    positionRiders();
    if (elapsed < duration) return;
    riding = false;
    atSummit = !atSummit;
    lagoon.group.visible = true;
    restorePose();
    hero.position.copy(atSummit ? summitLanding : islandLanding);
    const terrain = atSummit ? summit : lagoon;
    terrain.group.add(companion.character);
    companion.reset(hero.position, terrain.blockers, terrain);
    showScenery();
    onArrival(atSummit);
    toast(
      atSummit
        ? "Summit castle · Walk through the open arch to explore. Cable car: beside the castle · C."
        : "Back on the flower island · Your lagoon treasures are safe",
    );
  }
  function reset() {
    riding = atSummit = false;
    elapsed = 0;
    restorePose();
    if (enabled) lagoon.group.add(companion.character);
    enabled = false;
    group.visible = false;
    cabin.position.copy(startPoint);
  }
  cabin.position.copy(startPoint);
  showScenery();
  return {
    group,
    cabin,
    summit,
    islandDock,
    summitDock,
    start,
    update,
    nearby,
    reset,
    updateVisibility(camera, characters, dt) {
      if (atSummit && !riding) castle.updateVisibility(camera, characters, dt);
    },
    setEnabled(value) {
      enabled = value;
      group.visible = value;
    },
    get riding() {
      return riding;
    },
    get atSummit() {
      return atSummit;
    },
  };
}
