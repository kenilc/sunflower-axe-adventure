import * as THREE from "../../../vendor/three.module.js";

// A few quiet festival visitors; their routes leave the bridge and main aisle open.
export function createFestivalCrowd({
  parent,
  blockers,
  mesh,
  box,
  cyl,
  ball,
}) {
  const group = new THREE.Group();
  group.name = "festival-visitors";
  parent.add(group);
  const people = [];
  const shirts = [
    "#d99198",
    "#94bdb0",
    "#d5b574",
    "#809ec6",
    "#b49ac6",
    "#eee0b7",
  ];
  const skins = ["#edc095", "#bc885f", "#e1aa7b", "#926849"];
  const hairColors = ["#393139", "#654534", "#322b2b", "#877263"];
  function person(x, z, heading, kind, index, scale = 1, route = null) {
    const character = new THREE.Group();
    character.name = `festival-${kind}-${index}`;
    character.position.set(x, 0, z);
    character.rotation.y = heading;
    character.scale.setScalar(scale);
    group.add(character);
    const rig = new THREE.Group();
    character.add(rig);
    const skin = skins[index % skins.length],
      shirt = shirts[index % shirts.length];
    const legs = [],
      arms = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.19, 0.52, 0);
      rig.add(leg);
      legs.push(leg);
      box(0.27, 0.34, 0.32, "#536278", 0, 0.03, 0, leg);
      box(0.2, 0.32, 0.22, skin, 0, -0.23, 0, leg);
      box(0.3, 0.16, 0.44, "#ded6bd", 0, -0.44, 0.07, leg);
      const arm = new THREE.Group();
      arm.position.set(side * 0.43, 1.38, 0);
      rig.add(arm);
      arms.push(arm);
      box(0.27, 0.24, 0.3, shirt, side * 0.06, -0.09, 0, arm);
      cyl(0.11, 0.12, 0.4, skin, side * 0.06, -0.37, 0, arm);
      ball(0.12, skin, side * 0.06, -0.58, 0, arm);
    }
    cyl(0.39, 0.45, 0.78, shirt, 0, 1.14, 0, rig, 10);
    cyl(0.2, 0.22, 0.12, skin, 0, 1.59, 0, rig, 10);
    const head = new THREE.Group();
    head.position.y = 1.96;
    rig.add(head);
    ball(0.44, hairColors[index % hairColors.length], 0, 0, -0.06, head);
    ball(0.37, skin, 0, -0.02, 0.13, head);
    const fringe = ball(
      0.3,
      hairColors[index % hairColors.length],
      -0.08,
      0.25,
      0.14,
      head,
    );
    fringe.scale.set(1, 0.4, 0.8);
    for (const side of [-1, 1]) {
      ball(0.054, "#35303b", side * 0.14, 0.015, 0.465, head);
      ball(0.013, "#fff5dc", side * 0.14 - 0.012, 0.029, 0.51, head);
      ball(0.078, skin, side * 0.35, -0.015, 0.08, head);
    }
    const smile = mesh(
      new THREE.TorusGeometry(0.065, 0.012, 5, 10, Math.PI),
      "#8c5349",
      0,
      -0.1,
      0.495,
      head,
    );
    smile.rotation.z = Math.PI;
    if (kind === "vendor") {
      box(0.6, 0.58, 0.035, "#f1e4c7", 0, 1.05, 0.42, rig);
      box(0.06, 0.5, 0.04, "#f1e4c7", -0.24, 1.43, 0.35, rig);
      box(0.06, 0.5, 0.04, "#f1e4c7", 0.24, 1.43, 0.35, rig);
    }
    if (kind === "tea" || kind === "snack") {
      const hand = arms[1];
      hand.rotation.x = -0.8;
      cyl(
        0.11,
        0.09,
        0.22,
        kind === "tea" ? "#b3d0bf" : "#f2dcae",
        0.06,
        -0.58,
        0.08,
        hand,
        10,
      );
      if (kind === "snack") ball(0.14, "#efacae", 0.06, -0.43, 0.08, hand);
    }
    const obstacle = { x, z, r: 0.33 * scale };
    // Vendor positions already belong to the stall's solid counter footprint.
    if (kind !== "vendor") blockers.push(obstacle);
    people.push({
      character,
      rig,
      head,
      legs,
      arms,
      kind,
      index,
      route,
      obstacle,
    });
  }
  let index = 0;
  for (const side of [-1, 1])
    for (const z of [20, 12, 4]) {
      person(side * 13, z - 0.85, 0, "vendor", index++);
      person(side * 12.4, z + 3.2, Math.PI + side * 0.2, "snack", index++);
    }
  person(-14.4, 22.9, 0.8, "chat", index++);
  person(-16, 23, -0.8, "chat", index++, 0.8);
  person(-17.4, -19.3, 0.25, "tea", index++);
  person(-12.6, -19.3, -0.25, "tea", index++);
  person(17, -16.9, -1.1, "chat", index++);
  person(18.5, -16.7, 1.8, "chat", index++);
  for (const side of [-1, 1]) {
    person(side * 7, 14, 0, "stroll", index++, 1, {
      x: side * 7,
      z: 14,
      dx: 0.35,
      dz: 5,
    });
    person(side * 9, -18.4, 0, "stroll", index++, 0.9, {
      x: side * 9,
      z: -18.4,
      dx: 4,
      dz: 0.2,
    });
  }
  group.userData.visitorCount = people.length;
  function update(time) {
    people.forEach(
      ({ character, rig, head, legs, arms, kind, index, route, obstacle }) => {
        const phase = time * 0.24 + index * 1.7;
        if (route) {
          character.position.set(
            route.x + Math.sin(phase) * route.dx,
            0,
            route.z + Math.cos(phase) * route.dz,
          );
          character.rotation.y = Math.atan2(
            Math.cos(phase) * route.dx,
            -Math.sin(phase) * route.dz,
          );
          const gait = Math.sin(time * 3 + index) * 0.23;
          legs.forEach((leg, i) => {
            leg.rotation.x = i ? gait : -gait;
            arms[i].rotation.x = -leg.rotation.x * 0.6;
          });
          rig.position.y = Math.abs(Math.sin(time * 3 + index)) * 0.025;
          obstacle.x = character.position.x;
          obstacle.z = character.position.z;
        } else {
          head.rotation.y = Math.sin(time * 0.55 + index) * 0.08;
          rig.position.y = Math.sin(time * 1.1 + index) * 0.012;
          arms[0].rotation.x =
            kind === "vendor"
              ? -0.35 + Math.sin(time * 0.8 + index) * 0.15
              : Math.sin(time * 0.8 + index) * 0.045;
          if (kind === "tea" || kind === "snack")
            arms[1].rotation.x = -0.8 + Math.sin(time * 0.65 + index) * 0.09;
        }
      },
    );
  }
  update(0);
  return { group, people, update };
}
