import * as THREE from "./vendor/three.module.js";
import { createTreeVisibility } from "./tree-visibility.js?v=20261002-camera-clear";

export function createSummitCastle({
  parent,
  center,
  blockers,
  mesh,
  box,
  cyl,
}) {
  const castle = new THREE.Group();
  castle.name = "summit-castle";
  castle.position.copy(center).add(new THREE.Vector3(1.7, 0, -2));
  castle.scale.setScalar(1.65);
  parent.add(castle);
  const visibility = createTreeVisibility({
    cameraClearance: 0.5,
    obstructedOpacity: 0.08,
  });
  const shells = [];
  const stone = "#e7d8c9",
    trim = "#f5e8cb",
    roofColor = "#b788ae";
  function shell(name) {
    const group = new THREE.Group();
    group.name = name;
    castle.add(group);
    shells.push(group);
    return group;
  }
  function blocker(x, z, r = 0.18) {
    blockers.push({
      x: castle.position.x + x * 1.65,
      z: castle.position.z + z * 1.65,
      r: r * 1.65,
      minClearance: 0.8,
    });
  }
  function wall(name, x1, z1, x2, z2) {
    const group = shell(name);
    const width = Math.abs(x2 - x1) || 0.28;
    const depth = Math.abs(z2 - z1) || 0.28;
    box(width, 4.3, depth, stone, (x1 + x2) / 2, 2.15, (z1 + z2) / 2, group);
    const steps = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.28);
    for (let i = 0; i <= steps; i++)
      blocker(x1 + ((x2 - x1) * i) / steps, z1 + ((z2 - z1) * i) / steps);
    return group;
  }
  wall("castle-west-wall", -2.1, -2.2, -2.1, 2.2);
  wall("castle-east-wall", 2.1, -2.2, 2.1, 2.2);
  wall("castle-back-wall", -2.1, -2.2, 2.1, -2.2);
  wall("castle-door-left", -2.1, 2.2, -1.4, 2.2);
  wall("castle-door-right", 1.4, 2.2, 2.1, 2.2);
  const lintel = shell("castle-door-arch");
  box(4.4, 0.55, 0.34, trim, 0, 4.1, 2.2, lintel);
  mesh(
    new THREE.TorusGeometry(1.4, 0.14, 6, 32, Math.PI),
    trim,
    0,
    2.65,
    2.4,
    lintel,
  );
  for (const x of [-1.4, 1.4])
    box(0.14, 2.65, 0.18, trim, x, 1.325, 2.4, lintel);
  // The door is permanently open: walking through the arch enters the room.
  const roof = shell("castle-roof");
  const canopy = mesh(
    new THREE.ConeGeometry(3.4, 1.65, 4),
    roofColor,
    0,
    5.05,
    0,
    roof,
  );
  canopy.rotation.y = Math.PI / 4;
  canopy.scale.z = 1.08;
  for (const x of [-2.05, 2.05]) {
    for (const z of [-2.1, 2.1]) {
      const tower = shell("castle-turret");
      cyl(0.54, 0.62, 5.25, stone, x, 2.625, z, tower, 12);
      cyl(0.65, 0.65, 0.25, trim, x, 5.15, z, tower, 12);
      mesh(new THREE.ConeGeometry(0.9, 1.5, 12), roofColor, x, 6, z, tower);
      cyl(0.025, 0.025, 0.7, "#e5c57f", x, 7.05, z, tower);
      const flag = box(0.5, 0.28, 0.04, "#96c6ba", x + 0.25, 7.2, z, tower);
      flag.name = "castle-flag";
      blocker(x, z, 0.62);
      const window = mesh(
        new THREE.SphereGeometry(0.23, 10, 8),
        "#638e99",
        x,
        3.6,
        z + 0.5,
        tower,
      );
      window.scale.set(0.7, 1.4, 0.3);
    }
  }
  // Pale stone foundation, a soft rug, reading cushions and a warm hearth.
  box(4.2, 0.04, 4.4, "#dec9a5", 0, 0.015, 0, castle);
  box(2.1, 0.025, 2.6, "#c9a4b8", 0, 0.045, -0.1, castle);
  for (const x of [-0.65, 0.65]) {
    const cushion = mesh(
      new THREE.SphereGeometry(0.35, 10, 6),
      "#97beb0",
      x,
      0.18,
      -1.25,
      castle,
    );
    cushion.scale.set(1, 0.45, 1);
  }
  const hearth = shell("castle-hearth");
  box(1.1, 1.2, 0.35, "#b09c88", 0, 0.6, -1.94, hearth);
  box(0.75, 0.65, 0.05, "#644d48", 0, 0.4, -1.73, hearth);
  mesh(
    new THREE.ConeGeometry(0.16, 0.45, 7),
    "#ffc87e",
    0,
    0.35,
    -1.68,
    hearth,
  );
  blocker(0, -1.94, 0.5);
  for (const x of [-0.75, 0.75]) {
    cyl(0.12, 0.18, 0.25, "#c38f7e", x, 0.14, 2.6, castle);
    for (let i = 0; i < 3; i++)
      mesh(
        new THREE.IcosahedronGeometry(0.13, 1),
        ["#eeb3c8", "#ffe4a8", "#a4c7aa"][i],
        x + (i - 1) * 0.12,
        0.45,
        2.6,
        castle,
      );
  }
  const light = new THREE.PointLight("#ffd3a0", 5, 8);
  light.position.set(0, 2.8, -0.8);
  castle.add(light);
  shells.forEach((group) => visibility.add(group));
  return {
    group: castle,
    entrance: castle.position.clone().add(new THREE.Vector3(0, 0, 5)),
    inside(position) {
      return (
        Math.abs(position.x - castle.position.x) < 1.8 * 1.65 &&
        Math.abs(position.z - castle.position.z) < 1.9 * 1.65
      );
    },
    isEntrance(position) {
      const x = (position.x - castle.position.x) / 1.65;
      const z = (position.z - castle.position.z) / 1.65;
      return Math.abs(x) < 0.95 && z < 2.25 && z > 1.55;
    },
    updateVisibility: visibility.update,
  };
}
