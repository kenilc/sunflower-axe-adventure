import * as THREE from "three";
import { createTreeVisibility } from "../../rendering/tree-visibility.js";
import { createAlpineNature } from "./nature.js";

export function createAlpineVillage({ mesh, box, cyl, ball }) {
  const group = new THREE.Group();
  group.name = "edelweiss-village";
  group.visible = false;
  const blockers = [],
    sheep = [],
    shops = [],
    stamps = new Set();
  const wood = "#966347",
    cream = "#f0e2cb",
    red = "#b75b5c";
  const entrance = new THREE.Group();
  entrance.position.set(0, 0, 33);
  const returnGate = new THREE.Group();
  returnGate.position.set(0, 0, 29);
  group.add(returnGate);
  function gate(parent) {
    for (const side of [-1, 1]) {
      box(0.35, 3.6, 0.4, wood, side * 2.5, 1.8, 0, parent);
      mesh(
        new THREE.ConeGeometry(0.5, 0.7, 4),
        red,
        side * 2.5,
        3.8,
        0,
        parent,
      ).rotation.y = Math.PI / 4;
      box(0.9, 0.9, 0.08, red, side * 2.5, 2.8, 0.28, parent);
      box(0.6, 0.18, 0.09, cream, side * 2.5, 2.8, 0.33, parent);
      box(0.18, 0.6, 0.09, cream, side * 2.5, 2.8, 0.33, parent);
    }
    box(5.4, 0.35, 0.5, wood, 0, 3.5, 0, parent);
  }
  gate(entrance);
  gate(returnGate);
  blockers.push({ x: -2.5, z: 29, r: 0.3 }, { x: 2.5, z: 29, r: 0.3 });
  const villageGround = box(78, 2, 43, "#8bad75", 0, -1.03, 12.5, group);
  villageGround.name = "alpine-village-ground";
  box(70, 0.05, 9, "#b5b9aa", 0, 0, 9, group);
  box(5, 0.05, 19, "#c7bca3", 0, 0.015, 22, group);
  box(5, 0.05, 18, "#c7bca3", -30, 0.015, -1, group);
  // Cobblestones, timber chalets, shutters and flower-filled balconies.
  for (let i = 0; i < 40; i++)
    for (let row = 0; row < 5; row++)
      box(
        1.6,
        0.035,
        1.4,
        (i + row) % 3 ? "#bdc0b0" : "#a4ab9e",
        -33 + i * 1.7 + (row % 2) * 0.3,
        0.045,
        5.6 + row * 1.6,
        group,
      );
  function flower(parent, x, y, z, color = "#f1b4c9", size = 0.18) {
    cyl(0.025, 0.025, 0.5, "#577647", x, y - 0.2, z, parent, 5);
    for (let i = 0; i < 5; i++)
      ball(
        size,
        color,
        x + Math.cos(i * Math.PI * 0.4) * size,
        y + Math.sin(i * Math.PI * 0.4) * size,
        z,
        parent,
      );
    ball(size * 0.65, "#f5d581", x, y, z + size * 0.6, parent);
  }
  function footprint(x, z, w, d, list = blockers) {
    const steps = Math.ceil(w / 1.1);
    for (let i = 0; i <= steps; i++)
      for (const side of [-1, 1])
        list.push({
          x: x + (i / steps - 0.5) * w,
          z: z + side * (d / 2 - 0.5),
          r: 0.6,
        });
    for (let offset = -d / 2; offset <= d / 2; offset += 1)
      for (const side of [-1, 1])
        list.push({ x: x + side * (w / 2 - 0.5), z: z + offset, r: 0.6 });
  }
  function room(kind, color) {
    const interior = new THREE.Group();
    interior.name = `${kind}-interior`;
    interior.visible = false;
    const obstacles = [];
    box(14, 0.2, 14, "#d3b796", 0, -0.12, 0, interior);
    for (const x of [-7, 7]) box(0.3, 4.5, 14, cream, x, 2.25, 0, interior);
    box(14, 4.5, 0.3, cream, 0, 2.25, -7, interior);
    for (const x of [-4, 0, 4]) {
      box(2.6, 2, 0.1, "#a6cbd0", x, 2.8, -6.8, interior);
      box(0.1, 2, 0.15, wood, x, 2.8, -6.7, interior);
    }
    box(9, 0.25, 0.3, wood, 0, 4.1, -6.6, interior);
    box(8, 1.2, 1.4, wood, 0, 0.6, -3.4, interior);
    box(8.2, 0.15, 1.6, "#efdec2", 0, 1.25, -3.4, interior);
    footprint(0, -3.4, 8, 1.4, obstacles);
    box(4, 0.03, 4, color, 0, 0.025, 1, interior);
    for (const side of [-1, 1]) {
      box(2, 2.6, 0.6, wood, side * 5, 1.3, -5.5, interior);
      obstacles.push({ x: side * 5, z: -5.5, r: 1.3 });
      for (let row = 0; row < 3; row++)
        box(2, 0.12, 0.8, "#e4c69d", side * 5, 0.6 + row * 0.8, -5.3, interior);
    }
    if (kind === "bakery") {
      for (let i = 0; i < 8; i++) {
        const loaf = ball(0.22, "#d4a164", -3 + i * 0.8, 1.55, -3.4, interior);
        loaf.scale.set(1.3, 0.65, 0.8);
      }
      for (const x of [-4.8, 4.8]) {
        cyl(0.9, 0.9, 0.15, "#e5cdb1", x, 1.2, 1.5, interior, 16);
        cyl(0.1, 0.2, 1.2, wood, x, 0.6, 1.5, interior);
        cyl(0.13, 0.12, 0.2, cream, x, 1.4, 1.5, interior);
        obstacles.push({ x, z: 1.5, r: 1.1 });
      }
    } else if (kind === "outfit") {
      for (const x of [-2.5, 0, 2.5]) {
        cyl(0.055, 0.055, 2.8, "#807967", x, 1.4, -5.5, interior);
        box(1, 1.3, 0.35, color, x, 2, -5.3, interior);
        box(1.8, 0.4, 0.35, color, x, 2.5, -5.3, interior);
        mesh(
          new THREE.TorusGeometry(0.35, 0.09, 6, 20),
          red,
          x,
          1.45,
          -3.3,
          interior,
        ).rotation.x = Math.PI / 2;
      }
    } else
      for (let i = 0; i < 9; i++) {
        cyl(0.15, 0.2, 0.3, "#b88768", -3.2 + i * 0.8, 1.5, -3.4, interior);
        flower(
          interior,
          -3.2 + i * 0.8,
          2.1,
          -3.4,
          ["#f0b7ca", "#eeda87", "#c0aed5"][i % 3],
        );
      }
    return {
      group: interior,
      blockers: obstacles,
      contains: (x, z) => Math.abs(x) < 6.5 && Math.abs(z) < 6.5,
      heightAt: () => 0,
      followDistance: 3,
      arrival: new THREE.Vector3(0, 0, 4),
      isExit: (p) => Math.abs(p.x) < 2 && p.z > 5.6,
    };
  }
  [
    [-18, "bakery", "#bd6665", "Alpine Bakery"],
    [-3, "outfit", "#709783", "Alpine Outfitters"],
    [12, "flowers", "#c595ac", "Edelweiss Flowers"],
  ].forEach(([x, kind, color, name]) => {
    const chalet = new THREE.Group();
    chalet.name = kind + "-chalet";
    chalet.position.set(x, 0, -0.5);
    group.add(chalet);
    box(10, 3.1, 7.5, cream, 0, 1.55, 0, chalet);
    box(10, 2.7, 7.5, wood, 0, 4.45, 0, chalet);
    for (let row = 0; row < 7; row++)
      box(10.1, 0.08, 7.6, "#795440", 0, 3.2 + row * 0.4, 0, chalet);
    for (const side of [-1, 1]) {
      const roof = box(6.1, 0.22, 9.5, "#6d665e", side * 2.6, 7, 0, chalet);
      roof.rotation.z = -side * Math.atan2(3.1, 5.2);
      for (const y of [1.8, 4.6]) {
        box(1.8, 1.6, 0.08, "#aad0cf", side * 3, y, 3.8, chalet);
        box(0.08, 1.6, 0.12, cream, side * 3, y, 3.85, chalet);
        for (const dx of [-1.15, 1.15])
          box(0.48, 1.8, 0.14, color, side * 3 + dx, y, 3.86, chalet);
      }
    }
    box(1.8, 2.6, 0.12, "#634b3b", 0, 1.3, 3.83, chalet);
    ball(0.06, "#e8c977", 0.6, 1.2, 3.95, chalet);
    box(3.6, 0.2, 2.2, color, 0, 3, 4.6, chalet).rotation.x = 0.12;
    box(10.5, 0.2, 1.2, wood, 0, 3.6, 4.15, chalet);
    for (let i = 0; i < 12; i++)
      box(0.09, 0.9, 0.09, "#d9b594", -4.7 + i * 0.85, 4.1, 4.7, chalet);
    box(10.3, 0.12, 0.12, wood, 0, 4.55, 4.7, chalet);
    for (const side of [-1, 1]) {
      box(2.8, 0.35, 0.45, "#805a42", side * 3, 3.8, 4.9, chalet);
      for (let i = 0; i < 5; i++)
        flower(
          chalet,
          side * 3 - 1 + i * 0.5,
          4.15,
          5,
          ["#e78894", "#f4d47e", "#efb8d0"][i % 3],
          0.13,
        );
    }
    box(0.7, 1.4, 0.7, "#908778", 3.5, 7.8, -1, chalet);
    footprint(x, -0.5, 10, 7.5);
    const doorway = new THREE.Vector3(x, 0, 5.2);
    shops.push({ kind, name, doorway, room: room(kind, color) });
  });
  // A small fountain and outdoor café tables beside the street.
  cyl(1.4, 1.7, 0.55, "#b7b9a5", -13, 0.28, 18, group, 24);
  cyl(1.2, 1.2, 0.05, "#8fc8d2", -13, 0.58, 18, group, 24);
  cyl(0.15, 0.2, 1.6, "#929e91", -13, 1, 18, group);
  blockers.push({ x: -13, z: 18, r: 1.7 });
  for (const x of [-22, -17]) {
    cyl(1, 1, 0.12, cream, x, 1.15, 13.8, group, 16);
    cyl(0.09, 0.18, 1.15, wood, x, 0.6, 13.8, group);
    blockers.push({ x, z: 13.8, r: 1.15 });
  }
  for (const x of [-27, -10, 7, 26]) {
    cyl(0.09, 0.15, 3.6, "#64786d", x, 1.8, 11.8, group);
    ball(0.25, "#f7e2a4", x, 3.65, 11.8, group);
    blockers.push({ x, z: 11.8, r: 0.18 });
  }
  // The sheep stay in a meadow beside the village, clear of doors and trail.
  for (const z of [15, 27])
    for (let x = 20; x <= 35; x += 2.5) {
      cyl(0.09, 0.12, 1.1, wood, x, 0.55, z, group);
      box(2.5, 0.12, 0.12, "#d9c19a", x, 0.8, z, group);
      blockers.push({ x, z, r: 0.15 });
    }
  for (const x of [20, 35])
    for (let z = 15; z <= 27; z += 2) {
      if (x === 20 && z > 17 && z < 23) continue;
      cyl(0.09, 0.12, 1.1, wood, x, 0.55, z, group);
      box(0.12, 0.12, 2, "#d9c19a", x, 0.8, z, group);
      blockers.push({ x, z, r: 0.15 });
    }
  for (let i = 0; i < 8; i++) {
    const animal = new THREE.Group();
    animal.name = "alpine-sheep";
    group.add(animal);
    const home = new THREE.Vector3(
      22 + (i % 4) * 3,
      0,
      18 + Math.floor(i / 4) * 6,
    );
    animal.position.copy(home);
    const legs = [];
    for (const x of [-0.3, 0.3])
      for (const z of [-0.4, 0.4])
        legs.push(cyl(0.09, 0.08, 0.65, "#716653", x, 0.32, z, animal));
    const wool = ball(0.68, "#fff1d8", 0, 0.95, 0, animal);
    wool.scale.set(0.8, 0.8, 1.25);
    for (let j = 0; j < 9; j++)
      ball(
        0.25,
        "#f1e4cc",
        Math.cos(j * 2.4) * 0.43,
        1 + Math.sin(j * 2.4) * 0.32,
        ((j % 3) - 1) * 0.4,
        animal,
      );
    const head = new THREE.Group();
    head.position.set(0, 1.05, 0.65);
    animal.add(head);
    const face = ball(0.31, "#8e826b", 0, 0, 0.12, head);
    face.scale.z = 1.35;
    for (const side of [-1, 1]) {
      const ear = ball(0.17, "#c3b498", side * 0.33, 0.13, 0, head);
      ear.scale.set(1.5, 0.5, 0.7);
      ball(0.035, "#333d35", side * 0.14, 0.07, 0.4, head);
    }
    const collar = mesh(
      new THREE.TorusGeometry(0.27, 0.045, 5, 16),
      red,
      0,
      0.95,
      0.55,
      animal,
    );
    collar.rotation.x = Math.PI / 2;
    ball(0.1, "#e9bf64", 0, 0.7, 0.78, animal);
    const obstacle = { x: home.x, z: home.z, r: 0.5 };
    blockers.push(obstacle);
    sheep.push({
      group: animal,
      home,
      head,
      legs,
      obstacle,
      petTime: 0,
      phase: i * 1.7,
    });
  }
  // Trail surfaces and their height sampler share the same centerline.
  const route = [
    new THREE.Vector3(-30, 0, -7),
    new THREE.Vector3(-30, 3, -16),
    new THREE.Vector3(-30, 9, -26),
    new THREE.Vector3(-25, 17, -32),
    new THREE.Vector3(-13, 19, -36),
    new THREE.Vector3(-1, 19, -36),
    new THREE.Vector3(12, 23, -40),
    new THREE.Vector3(26, 26, -44),
    new THREE.Vector3(30, 34, -50),
    new THREE.Vector3(39, 37, -56),
    new THREE.Vector3(42, 43, -66),
    new THREE.Vector3(48, 43, -72),
  ];
  const lookout = route.at(-1).clone();
  const bridgeSegment = 4;
  const trailRadius = 1.25;
  // Shared corner normals join the ledges and the mountain without gaps.
  const inward = route.map((p, i) => {
    const direction = new THREE.Vector3();
    for (const j of [i - 1, i]) {
      if (j < 0 || j >= route.length - 1) continue;
      const delta = route[j + 1].clone().sub(route[j]);
      direction.add(new THREE.Vector3(delta.z, 0, -delta.x).normalize());
    }
    return direction.normalize();
  });
  function trailSample(x, z) {
    let best = { distance: Infinity, y: 0, segment: -1 };
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i],
        b = route[i + 1],
        dx = b.x - a.x,
        dz = b.z - a.z;
      const t = THREE.MathUtils.clamp(
        ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz),
        0,
        1,
      );
      const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
      if (distance < best.distance)
        best = {
          distance,
          y: THREE.MathUtils.lerp(a.y, b.y, t),
          segment: i,
          center: a.clone().lerp(b, t),
        };
    }
    return best;
  }
  function beam(a, b, radius, color) {
    const d = b.clone().sub(a);
    const pole = cyl(radius, radius, d.length(), color, 0, 0, 0, group, 6);
    pole.position.copy(a).add(b).multiplyScalar(0.5);
    pole.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.normalize(),
    );
  }
  function surface(points, indices, color, name) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        points.flatMap((p) => p.toArray()),
        3,
      ),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const rock = mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      0,
      0,
      0,
      group,
    );
    rock.name = name;
    return rock;
  }
  const cliffFaces = [],
    ladders = [];
  const rockVisibility = createTreeVisibility({
    obstructedOpacity: 0.035,
    cameraClearance: 0.3,
  });
  const ridgeHeights = [18, 31, 42, 52, 49, 51, 61, 69, 77, 73, 78, 66];
  function solidCliff(i, width) {
    const a = route[i],
      b = route[i + 1];
    // Each cross-section encloses the rock from the valley floor, around its
    // ledge and irregular summit, and back down a broad rear slope.
    function profile(p, ridge) {
      return [
        [-14, -5],
        [-width, p.y - 0.12],
        [1.8, p.y - 0.12],
        [3.6, p.y + 6],
        [9, p.y + (ridge - p.y) * 0.62],
        [18, ridge],
        [31, (ridge - 5) * 0.35],
        [45, -5],
      ];
    }
    const profiles = [
      profile(a, ridgeHeights[i]),
      profile(b, ridgeHeights[i + 1]),
    ];
    const points = profiles.flatMap((section, end) =>
      section.map(([offset, height]) =>
        (end ? b : a)
          .clone()
          .addScaledVector(inward[i + end], offset)
          .setY(height)
          // Widen the gorge toward the sky, with banks meeting at the stream
          // bed instead of two parallel walls making a rectangular slot.
          .add(
            new THREE.Vector3(
              i + end === bridgeSegment
                ? -(height - route[bridgeSegment].y) * 0.17
                : i + end === bridgeSegment + 1
                  ? (height - route[bridgeSegment + 1].y) * 0.17
                  : 0,
              0,
              0,
            ),
          ),
      ),
    );
    const count = profiles[0].length,
      indices = [];
    for (let j = 0; j < count; j++) {
      const k = (j + 1) % count;
      indices.push(j, j + count, k, k, j + count, k + count);
    }
    // Close both ends with actual triangles, including the concave ledge.
    profiles.forEach((section, end) => {
      const polygon = section.map(([x, y]) => new THREE.Vector2(x, y));
      for (const triangle of THREE.ShapeUtils.triangulateShape(polygon, [])) {
        const [u, v, w] = triangle.map((index) => polygon[index]);
        const area = (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
        if (area > 0 !== Boolean(end)) triangle.reverse();
        indices.push(...triangle.map((index) => index + end * count));
      }
    });
    let volume = 0;
    for (let j = 0; j < indices.length; j += 3)
      volume +=
        points[indices[j]].dot(
          points[indices[j + 1]].clone().cross(points[indices[j + 2]]),
        ) / 6;
    if (volume < 0)
      for (let j = 0; j < indices.length; j += 3)
        [indices[j + 1], indices[j + 2]] = [indices[j + 2], indices[j + 1]];
    const rockGroup = new THREE.Group();
    rockGroup.name = "grounded-alpine-massif";
    group.add(rockGroup);
    const rock = surface(points, indices, "#87968a", "alpine-cliff-face");
    rockGroup.add(rock);
    rock.material.side = THREE.FrontSide;
    // Facet colors follow elevation, with snow attached to the rock itself.
    const colors = [];
    points.forEach((p) => {
      const color = new THREE.Color(
        p.y > 60 ? "#eaf0e7" : p.y > 27 ? "#8f9c94" : "#789176",
      );
      colors.push(color.r, color.g, color.b);
    });
    rock.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    rock.material.color.set("#ffffff");
    rock.material.vertexColors = true;
    rock.userData.solid = true;
    cliffFaces.push(rock);
    rockVisibility.add(rockGroup);
  }
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i],
      b = route[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const bridge = i === bridgeSegment;
    const steep = (b.y - a.y) / length > 0.7;
    const edge = (p, normal, offset, y = p.y) =>
      p.clone().addScaledVector(normal, offset).setY(y);
    const width = i === 0 ? 2 : 1.6;
    surface(
      [
        edge(a, inward[i], -width, a.y + 0.015),
        edge(a, inward[i], width, a.y + 0.015),
        edge(b, inward[i + 1], -width, b.y + 0.015),
        edge(b, inward[i + 1], width, b.y + 0.015),
      ],
      [0, 1, 2, 1, 3, 2],
      bridge ? "#c5a17a" : "#a39f8a",
      bridge ? "alpine-cable-bridge" : "via-ferrata-path",
    );
    if (!bridge) {
      solidCliff(i, 1.6);
      // Iron anchors are bolted to the inside wall, instead of fence posts
      // on both sides. The safety cable follows the mountain face.
      for (let t = 0; t <= 1; t += 1 / Math.ceil(length / 2)) {
        const p = a.clone().lerp(b, t);
        const n = inward[i]
          .clone()
          .lerp(inward[i + 1], t)
          .normalize();
        const anchor = p
          .clone()
          .addScaledVector(n, 1.65)
          .add(new THREE.Vector3(0, 1.3, 0));
        beam(anchor, anchor.clone().addScaledVector(n, 0.65), 0.065, "#596d68");
        mesh(
          new THREE.TorusGeometry(0.12, 0.03, 5, 10),
          "#b6c3bc",
          anchor.x,
          anchor.y,
          anchor.z,
          group,
        ).name = "via-ferrata-anchor";
      }
    }
    for (const side of bridge ? [-1, 1] : [1]) {
      const cableA = edge(a, inward[i], side * 1.5, a.y + 1.3);
      const cableB = edge(b, inward[i + 1], side * 1.5, b.y + 1.3);
      beam(cableA, cableB, 0.04, "#526962");
      if (bridge) {
        for (let t = 0; t <= 1; t += 1 / 7) {
          const p = cableA.clone().lerp(cableB, t);
          beam(
            p,
            p.clone().add(new THREE.Vector3(0, -1.3, 0)),
            0.045,
            "#6d7972",
          );
        }
      }
    }
    if (bridge || steep) {
      const rungCount = Math.ceil(a.distanceTo(b) / (bridge ? 0.45 : 0.5));
      const dx = b.x - a.x,
        dz = b.z - a.z;
      for (let j = 0; j <= rungCount; j++) {
        const p = a.clone().lerp(b, j / rungCount);
        const rung = box(
          bridge ? 0.28 : 0.12,
          0.09,
          bridge ? 3.1 : 2.3,
          bridge ? wood : "#617a75",
          p.x,
          p.y + 0.06,
          p.z,
          group,
        );
        rung.rotation.y = -Math.atan2(dz, dx);
        rung.name = bridge ? "bridge-plank" : "via-ferrata-iron-rung";
        if (!bridge) ladders.push(rung);
      }
      if (steep) {
        for (const side of [-1, 1]) {
          beam(
            edge(a, inward[i], side * 1.05, a.y + 0.05),
            edge(b, inward[i + 1], side * 1.05, b.y + 0.05),
            0.06,
            "#617a75",
          );
        }
      }
    }
    // Red and white paint blazes on the rock help the route read naturally.
    if (!bridge && i > 0) {
      const p = a.clone().lerp(b, 0.5);
      const n = inward[i]
        .clone()
        .lerp(inward[i + 1], 0.5)
        .normalize();
      const marker = new THREE.Group();
      marker.position
        .copy(p)
        .addScaledVector(n, 1.78)
        .add(new THREE.Vector3(0, 2, 0));
      marker.rotation.y = Math.atan2(-n.x, -n.z);
      group.add(marker);
      box(0.36, 0.6, 0.035, cream, 0, 0, 0, marker);
      box(0.36, 0.2, 0.045, red, 0, 0, 0.025, marker);
    }
  }
  const lookoutDeck = cyl(
    3.8,
    3.8,
    0.24,
    "#bdad88",
    lookout.x,
    lookout.y - 0.13,
    lookout.z,
    group,
    24,
  );
  lookoutDeck.name = "alpine-mountain-lookout";
  const flag = new THREE.Group();
  flag.position.copy(lookout).add(new THREE.Vector3(2.5, 0, -1.4));
  group.add(flag);
  cyl(0.055, 0.08, 4, "#9d9887", 0, 2, 0, flag);
  box(1.4, 1.2, 0.025, red, 0.7, 3.3, 0, flag);
  box(0.8, 0.22, 0.035, cream, 0.7, 3.3, 0.02, flag);
  box(0.22, 0.8, 0.035, cream, 0.7, 3.3, 0.02, flag);
  blockers.push({ x: flag.position.x, z: flag.position.z, r: 0.15 });
  const valleyGround = box(200, 2, 190, "#83a87a", 0, -6, -65, group);
  valleyGround.name = "alpine-valley-ground";
  const ravine = new THREE.Group();
  ravine.name = "alpine-stream-ravine";
  group.add(ravine);
  const ravineBanks = [];
  const creekCenter = (z) =>
    -7 + (z + 36) * 0.15 + Math.sin((z + 36) * 0.065) * 0.35;
  for (let i = 0; i < 14; i++) {
    const z0 = -76 + i * 4.5,
      z1 = z0 + 4.5;
    const c0 = creekCenter(z0),
      c1 = creekCenter(z1);
    const water = surface(
      [
        new THREE.Vector3(c0 - 1.4, -4.91, z0),
        new THREE.Vector3(c0 + 1.4, -4.91, z0),
        new THREE.Vector3(c1 - 1.4, -4.91, z1),
        new THREE.Vector3(c1 + 1.4, -4.91, z1),
      ],
      [0, 2, 1, 1, 2, 3],
      "#90cdd0",
      "ravine-stream-water",
    );
    water.castShadow = false;
    ravine.add(water);
    for (const side of [-1, 1]) {
      const points = [];
      for (const [center, z] of [
        [c0, z0],
        [c1, z1],
      ]) {
        points.push(
          new THREE.Vector3(center + side * 1.5, -4.94, z),
          new THREE.Vector3(center + side * 4.2, -3.2, z),
          new THREE.Vector3(center + side * 6, -5, z),
        );
      }
      const bank = surface(
        points,
        [
          0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5, 0, 2, 3, 2, 5, 3, 0, 1, 2, 3, 5,
          4,
        ],
        "#8b997d",
        "ravine-sloping-bank",
      );
      if (side < 0) {
        const indices = bank.geometry.index;
        for (let j = 0; j < indices.count; j += 3) {
          const middle = indices.getX(j + 1);
          indices.setX(j + 1, indices.getX(j + 2));
          indices.setX(j + 2, middle);
        }
        bank.geometry.computeVertexNormals();
      }
      bank.userData.side = side;
      ravine.add(bank);
      ravineBanks.push(bank);
    }
    if (i % 3 === 0) {
      const stone = ball(
        0.65,
        "#9b9e8a",
        c0 + (i % 2 ? -1.7 : 1.7),
        -4.72,
        z0 + 1,
        ravine,
      );
      stone.scale.set(0.7, 0.6, 1.1);
      box(0.8, 0.015, 0.07, "#d5e8da", c0, -4.88, z0 + 2, ravine).castShadow =
        false;
    }
  }
  const mountainSurfaces = [...cliffFaces];
  // A distant alpine panorama frames the village and the high viewpoint.
  for (const [x, z, r, h] of [
    [-58, -78, 30, 47],
    [-25, -94, 35, 68],
    [20, -100, 37, 76],
    [62, -82, 33, 58],
  ]) {
    const peak = new THREE.Group();
    peak.name = "swiss-mountain-peak";
    group.add(peak);
    const mountain = mesh(
      new THREE.ConeGeometry(r, h, 7),
      "#879b93",
      x,
      h / 2 - 5,
      z,
      peak,
    );
    mountain.name = "swiss-mountain";
    mountainSurfaces.push(mountain);
    mesh(
      new THREE.ConeGeometry(r * 0.3, h * 0.3, 7),
      "#edf3e9",
      x,
      h * 0.85 - 4.98,
      z,
      peak,
    );
    rockVisibility.add(peak);
  }
  const nature = createAlpineNature({
    parent: group,
    surfaces: mountainSurfaces,
    trailDistance: (x, z) => trailSample(x, z).distance,
    lookout,
    meadowSurfaces: [villageGround, valleyGround, ...ravineBanks],
    treeAllowed: (x, z) =>
      !(z < -18 && z > -78 && Math.abs(x - creekCenter(z)) < 5.5),
    grassAllowed(x, z) {
      if (Math.abs(x) < 36 && z >= -7 && z < 32) {
        if (
          Math.abs(z - 9) < 5.2 ||
          (Math.abs(x) < 3 && z > 12) ||
          (Math.abs(x + 30) < 3 && z < 12)
        )
          return false;
        if (shops.some((shop) => Math.abs(x - shop.doorway.x) < 6 && z < 5.5))
          return false;
        if (
          Math.hypot(x + 13, z - 18) < 2.3 ||
          [-22, -17].some((tx) => Math.hypot(x - tx, z - 13.8) < 1.6)
        )
          return false;
      }
      return !(z < -12 && z > -77 && Math.abs(x - creekCenter(z)) < 1.65);
    },
  });
  function onTrail(x, z) {
    return z < -7 && trailSample(x, z).distance < trailRadius;
  }
  function contains(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    return (
      (Math.abs(x) < 36 && z >= -7 && z < 32) ||
      onTrail(x, z) ||
      Math.hypot(x - lookout.x, z - lookout.z) < 3.5
    );
  }
  function heightAt(x, z) {
    return z >= -7
      ? 0
      : Math.hypot(x - lookout.x, z - lookout.z) < 3.5
        ? lookout.y
        : trailSample(x, z).y;
  }
  function nearby(p, shop = null) {
    if (shop)
      return Math.hypot(p.x, p.z + 1.1) < 2.4
        ? {
            kind: shop.kind,
            label: {
              bakery: "Share a pastry · X",
              outfit: "Try an alpine scarf · X",
              flowers: "Pick a bouquet · X",
            }[shop.kind],
          }
        : null;
    const door = shops.find((s) => p.distanceTo(s.doorway) < 2.1);
    if (door)
      return { kind: "shop", shop: door, label: `Enter ${door.name} · X` };
    const pet = sheep.find(
      (s) =>
        Math.hypot(p.x - s.group.position.x, p.z - s.group.position.z) < 2.5,
    );
    if (pet) return { kind: "sheep", sheep: pet, label: "Pet the sheep · X" };
    if (p.distanceTo(lookout) < 3.2)
      return { kind: "lookout", label: "Ride the mountain cart together · X" };
    return null;
  }
  function update(dt, time, heroPosition) {
    nature.update(dt);
    for (const s of sheep) {
      const old = s.group.position.clone();
      const destination = s.home
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(time * 0.17 + s.phase) * 0.75,
            0,
            Math.cos(time * 0.13 + s.phase) * 0.6,
          ),
        );
      if (!heroPosition || destination.distanceTo(heroPosition) > 1.45)
        s.group.position.lerp(destination, 1 - Math.exp(-dt * 0.8));
      const moved = s.group.position.clone().sub(old);
      if (moved.lengthSq() > 0.000001)
        s.group.rotation.y = Math.atan2(moved.x, moved.z);
      s.petTime = Math.max(0, s.petTime - dt);
      s.head.rotation.x =
        s.petTime > 0
          ? -0.2 + Math.sin(time * 4) * 0.1
          : 0.25 + Math.sin(time * 0.8 + s.phase) * 0.16;
      s.legs.forEach(
        (leg, i) =>
          (leg.rotation.x =
            moved.lengthSq() > 0.000001
              ? Math.sin(time * 3 + (i % 2) * Math.PI) * 0.12
              : 0),
      );
      s.obstacle.x = s.group.position.x;
      s.obstacle.z = s.group.position.z;
    }
    flag.rotation.y = Math.sin(time * 1.2) * 0.06;
  }
  return {
    group,
    entrance,
    returnGate,
    blockers,
    shops,
    sheep,
    route,
    lookout,
    stamps,
    nearby,
    contains,
    heightAt,
    constrain(p, old) {
      if (
        !onTrail(old.x, old.z) ||
        p.z >= -7 ||
        Math.hypot(p.x - lookout.x, p.z - lookout.z) < 3.5
      )
        return;
      const sample = trailSample(p.x, p.z);
      if (sample.distance < trailRadius) return;
      const offset = new THREE.Vector3(
        p.x - sample.center.x,
        0,
        p.z - sample.center.z,
      ).setLength(trailRadius - 0.02);
      p.x = sample.center.x + offset.x;
      p.z = sample.center.z + offset.z;
    },
    onTrail,
    makeRoom(character, walker) {
      if (
        Math.hypot(
          character.position.x - walker.x,
          character.position.z - walker.z,
        ) > 1.35
      )
        return;
      const sample = trailSample(character.position.x, character.position.z);
      const a = route[sample.segment],
        b = route[sample.segment + 1];
      const normal = new THREE.Vector3(b.z - a.z, 0, a.x - b.x).normalize();
      const walkerSample = trailSample(walker.x, walker.z);
      const side =
        walker.clone().sub(walkerSample.center).dot(normal) < 0 ? -1 : 1;
      character.position
        .copy(sample.center)
        .addScaledVector(normal, -side * 1.1);
      character.position.y = heightAt(
        character.position.x,
        character.position.z,
      );
      walker.x = walkerSample.center.x + normal.x * side * 0.35;
      walker.z = walkerSample.center.z + normal.z * side * 0.35;
      walker.y = heightAt(walker.x, walker.z);
    },
    bridgeSegment,
    cliffFaces,
    ladders,
    nature,
    ravine,
    ravineBanks,
    updateVisibility(camera, characters, dt) {
      rockVisibility.update(camera, characters, dt);
      nature.updateVisibility(camera, characters);
    },
    trailInfo(p) {
      const sample = trailSample(p.x, p.z);
      const a = route[sample.segment],
        b = route[sample.segment + 1];
      return {
        segment: sample.segment,
        climbing: (b.y - a.y) / Math.hypot(b.x - a.x, b.z - a.z) > 0.7,
        bridge: sample.segment === bridgeSegment,
      };
    },
    clipPoint(p) {
      const { segment } = trailSample(p.x, p.z);
      const a = route[segment],
        b = route[segment + 1];
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const t = THREE.MathUtils.clamp(
        ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
        0,
        1,
      );
      const center = a.clone().lerp(b, t);
      const n = inward[segment].clone().lerp(inward[segment + 1], t);
      const side =
        segment === bridgeSegment && p.clone().sub(center).dot(n) < 0 ? -1 : 1;
      return center
        .addScaledVector(n, side * 1.5)
        .add(new THREE.Vector3(0, 1.3, 0));
    },
    update,
    followDistance: 2.5,
    arrival: new THREE.Vector3(0, 0, 20),
    isEntrance: (p) => Math.abs(p.x) < 1.8 && Math.abs(p.z - 33) < 1.1,
    isExit: (p) => Math.abs(p.x) < 1.8 && Math.abs(p.z - 29) < 1.1,
    reset() {
      stamps.clear();
      sheep.forEach((s) => {
        s.group.position.copy(s.home);
        s.obstacle.x = s.home.x;
        s.obstacle.z = s.home.z;
        s.petTime = 0;
      });
    },
  };
}

export function createAlpineOutfits({
  heroRig,
  companion,
  mesh,
  box,
  cyl,
  ball,
}) {
  const harnesses = [],
    scarves = [];
  const rigs = [heroRig, companion.rig];
  const climbing = [false, false];
  for (const rig of [heroRig, companion.rig]) {
    const harness = new THREE.Group();
    harness.name = "via-ferrata-harness";
    rig.body.add(harness);
    harness.visible = false;
    cyl(0.55, 0.6, 0.12, "#e6a66d", 0, 0.95, 0, harness, 12);
    for (const side of [-1, 1]) {
      box(
        0.1,
        0.8,
        0.12,
        "#e6a66d",
        side * 0.32,
        1.32,
        0.5,
        harness,
      ).rotation.z = side * 0.15;
      mesh(
        new THREE.TorusGeometry(0.22, 0.04, 5, 12),
        "#e6a66d",
        side * 0.22,
        0.6,
        0,
        harness,
      ).rotation.x = Math.PI / 2;
    }
    mesh(
      new THREE.TorusGeometry(0.09, 0.025, 5, 12),
      "#d2d8cf",
      0,
      0.92,
      0.6,
      harness,
    );
    harnesses.push(harness);
    const scarf = new THREE.Group();
    scarf.name = "alpine-scarf";
    scarf.visible = false;
    rig.body.add(scarf);
    cyl(0.41, 0.43, 0.18, "#bd6665", 0, 1.73, 0.04, scarf, 12);
    box(0.2, 0.7, 0.06, "#bd6665", 0.3, 1.33, 0.52, scarf);
    scarves.push(scarf);
    rig.appearance.registerAccessory("scarf", "alpine", [scarf]);
    rig.appearance.registerAccessory("harness", "alpine", [harness]);
  }
  const bouquet = new THREE.Group();
  bouquet.name = "alpine-bouquet";
  bouquet.visible = false;
  heroRig.arms[0].add(bouquet);
  bouquet.position.set(-0.1, -0.6, 0.2);
  for (let i = 0; i < 5; i++) {
    const x = Math.cos(i * 2.4) * 0.18,
      z = Math.sin(i * 2.4) * 0.18;
    cyl(0.018, 0.018, 0.6, "#577647", x, 0.15, z, bouquet, 5);
    ball(0.16, ["#f1b4c9", "#f2d58a", "#c1aed8"][i % 3], x, 0.47, z, bouquet);
  }
  return {
    harnesses,
    scarves,
    bouquet,
    setScarves() {
      rigs.forEach((rig) => rig.appearance.setAccessory("scarf", "alpine"));
    },
    setHiking(value) {
      rigs.forEach((rig) =>
        value
          ? rig.appearance.setAccessory("harness", "alpine")
          : rig.appearance.clearAccessory("harness"),
      );
      if (!value)
        rigs.forEach((rig, i) => {
          if (climbing[i]) {
            rig.body.rotation.x = 0;
            rig.arms.forEach((arm) => (arm.rotation.x = 0));
            climbing[i] = false;
          }
        });
    },
    poseClimb(index, value, time) {
      const rig = rigs[index];
      if (value) {
        rig.body.rotation.x = -0.15;
        rig.arms.forEach(
          (arm, i) =>
            (arm.rotation.x = -2.15 + Math.sin(time * 6 + i * Math.PI) * 0.35),
        );
        rig.legs.forEach(
          (leg, i) =>
            (leg.rotation.x = Math.sin(time * 6 + i * Math.PI) * 0.65),
        );
      } else if (climbing[index]) {
        rig.body.rotation.x = 0;
        rig.arms.forEach((arm) => (arm.rotation.x = 0));
      }
      climbing[index] = value;
    },
    reset() {
      rigs.forEach((rig, i) => {
        if (climbing[i]) {
          rig.body.rotation.x = 0;
          rig.arms.forEach((arm) => (arm.rotation.x = 0));
          climbing[i] = false;
        }
      });
      rigs.forEach((rig) => {
        rig.appearance.clearAccessory("harness");
        rig.appearance.clearAccessory("scarf");
      });
      bouquet.visible = false;
    },
  };
}
