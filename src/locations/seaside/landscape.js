import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createRandom } from "../../systems/random.js";
import { createTreeVisibility } from "../../rendering/tree-visibility.js";

function palmGeometry(lean) {
  const height = 7.4;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.15, 2, 0.08),
    new THREE.Vector3(lean * 0.5, 4.8, 0.22),
    new THREE.Vector3(lean, height, 0.35),
  ]);
  const trunk = new THREE.TubeGeometry(curve, 14, 0.3, 7, false);
  const positions = trunk.attributes.position;
  for (let ring = 0; ring <= 14; ring++) {
    const center = curve.getPointAt(ring / 14);
    for (let side = 0; side <= 7; side++) {
      const index = ring * 8 + side;
      const p = new THREE.Vector3().fromBufferAttribute(positions, index);
      p.sub(center)
        .multiplyScalar(1 - (ring / 14) * 0.48)
        .add(center);
      positions.setXYZ(index, p.x, p.y, p.z);
    }
  }
  trunk.computeVertexNormals();
  const rings = [];
  for (let i = 1; i < 18; i++) {
    const t = i / 19,
      center = curve.getPointAt(t);
    const geometry = new THREE.TorusGeometry(0.3 * (1 - t * 0.48), 0.018, 3, 7);
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        curve.getTangentAt(t),
      ),
    );
    geometry.translate(center.x, center.y, center.z);
    rings.push(geometry);
  }
  const fronds = [[], []];
  for (let i = 0; i < 9; i++) {
    const length = 3.4 + Math.sin(i * 2.4) * 0.45;
    const angle = (i / 9) * Math.PI * 2;
    const vertices = [];
    const point = (t, side = 0) =>
      new THREE.Vector3(
        t * length,
        Math.sin(t * Math.PI) * 0.6 - t * t * (0.9 + (i % 3) * 0.2),
        side,
      );
    const triangle = (a, b, c) =>
      vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (let j = 0; j < 13; j++) {
      const t = j / 13,
        next = (j + 1) / 13;
      const width = Math.sin((t + 0.05) * Math.PI) * 0.65;
      for (const side of [-1, 1]) {
        const tip = point(Math.min(1, t + 0.12), side * width);
        tip.y -= width * 0.2;
        triangle(point(t, side * 0.035), tip, point(next, side * 0.035));
      }
      triangle(point(t, -0.04), point(t, 0.04), point(next, -0.025));
      triangle(point(t, 0.04), point(next, 0.025), point(next, -0.025));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.computeVertexNormals();
    geometry.rotateY(angle);
    fronds[i % 2].push(geometry);
  }
  const coconuts = [-0.2, 0.2, 0].map((x, i) => {
    const geometry = new THREE.IcosahedronGeometry(0.19, 1);
    geometry.translate(x, -0.18 - i * 0.06, 0.1 + i * 0.12);
    return geometry;
  });
  const crown = curve.getPointAt(1);
  const result = {
    trunk,
    rings: mergeGeometries(rings),
    leaves: fronds.map((parts) => mergeGeometries(parts)),
    coconuts: mergeGeometries(coconuts),
    crown,
  };
  [...rings, ...fronds.flat(), ...coconuts].forEach((geometry) =>
    geometry.dispose(),
  );
  return result;
}

export function createCoastalLandscape({ parent, helpers, blockers }) {
  const { mesh, ball } = helpers;
  const random = createRandom(9241);
  const range = (a, b) => a + random() * (b - a);
  const group = new THREE.Group();
  group.name = "coastal-palm-landscape";
  parent.add(group);
  const visibility = createTreeVisibility({
    obstructedOpacity: 0.12,
  });
  const templates = [palmGeometry(0.65), palmGeometry(-0.9)];
  const bark = new THREE.MeshStandardMaterial({
    color: "#ae8861",
    roughness: 1,
  });
  const ridges = new THREE.MeshStandardMaterial({
    color: "#d2ab7a",
    roughness: 1,
  });
  const leaves = ["#668a62", "#8b9e65"].map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.95,
      }),
  );
  const coconut = new THREE.MeshStandardMaterial({
    color: "#96724f",
    roughness: 1,
  });
  const palms = [],
    dunes = [];
  function palm(x, z, scale, near = false, ground = 0) {
    const tree = new THREE.Group();
    tree.name = near ? "beach-palm" : "distant-coastal-palm";
    tree.position.set(x, ground, z);
    tree.rotation.y = range(-Math.PI, Math.PI);
    tree.scale.setScalar(scale);
    group.add(tree);
    const template = templates[palms.length % templates.length];
    mesh(template.trunk, bark, 0, 0, 0, tree);
    mesh(template.rings, ridges, 0, 0, 0, tree);
    const crowns = template.leaves.map((geometry, i) =>
      mesh(
        geometry,
        leaves[i],
        template.crown.x,
        template.crown.y,
        template.crown.z,
        tree,
      ),
    );
    if (near)
      mesh(
        template.coconuts,
        coconut,
        template.crown.x,
        template.crown.y,
        template.crown.z,
        tree,
      );
    tree.traverse((node) => {
      if (node.isMesh) node.castShadow = near;
    });
    if (near) {
      blockers.push({ x, z, r: 0.55 * scale });
      visibility.add(tree);
    }
    palms.push({ group: tree, crowns, phase: range(0, 20), near });
  }
  for (const [x, z, scale] of [
    [-24, 19, 1],
    [-19, 14, 0.86],
    [-27, 4, 1.08],
    [26, 9, 1.06],
    [22, 20, 0.92],
    [18, 10, 0.85],
    [28, -1, 0.94],
    [-28, -16, 0.9],
    [-35, 8, 1.1],
    [-33, -9, 1],
    [34, -9, 1.1],
    [36, 17, 1.08],
    [29, 29, 0.96],
    [-30, 31, 1.14],
  ])
    palm(x, z, scale, true);
  function dune(x, z, radius, stretch, height, color = "#d4b48b") {
    const hill = ball(radius, color, x, -radius * height * 0.3, z, group);
    hill.name = "outer-coastal-dune";
    hill.scale.set(stretch, height, 1);
    hill.castShadow = false;
    dunes.push(hill);
    return hill;
  }
  // Layer the coast on both sides and inland, rather than ending at the
  // walking rectangle. The northern sea and sunset remain open.
  for (const side of [-1, 1])
    for (let i = 0; i < 9; i++) {
      const x = side * (39 + (i % 3) * 13),
        z = -11 + i * 9;
      dune(x, z, range(6, 9), 1.4, range(0.35, 0.5));
      if (i % 2 === 0)
        palm(x + range(-3, 3), z + 1, range(0.95, 1.35), false, 1.2);
    }
  for (let i = 0; i < 12; i++) {
    const x = -88 + i * 16,
      z = 43 + Math.sin(i * 1.7) * 9;
    dune(x, z, range(8, 12), 1.65, 0.45, i % 2 ? "#cbb28c" : "#d9bd92");
    palm(x + 2, z + 1, range(1.1, 1.6), false, 1.6);
    if (i % 3 === 0) palm(x - 4, z + 4, 1.1, false, 1.6);
  }
  for (const [x, z, radius] of [
    [-115, 108, 28],
    [-55, 118, 32],
    [20, 128, 38],
    [95, 108, 32],
  ]) {
    dune(x, z, radius, 1.55, 0.26, "#b7ac86");
    palm(x, z - 7, 1.7, false, 3);
    palm(x + 12, z, 1.5, false, 3);
  }
  const outerPoint = () => {
    if (random() < 0.48)
      return [random() < 0.5 ? range(-79, -31) : range(31, 79), range(-13, 78)];
    return [range(-100, 100), range(29, 100)];
  };
  group.updateWorldMatrix(true, true);
  const terrainRay = new THREE.Raycaster();
  const downward = new THREE.Vector3(0, -1, 0);
  function groundAt(x, z) {
    terrainRay.set(new THREE.Vector3(x, 25, z), downward);
    const hit = terrainRay.intersectObjects(dunes, false)[0];
    return Math.max(0, hit?.point.y ?? 0);
  }
  const plantGeometry = new THREE.IcosahedronGeometry(1, 1);
  const groundCover = new THREE.InstancedMesh(
    plantGeometry,
    new THREE.MeshStandardMaterial({
      color: "#84966b",
      roughness: 1,
      flatShading: true,
    }),
    540,
  );
  groundCover.name = "outer-dune-groundcover";
  groundCover.castShadow = false;
  groundCover.receiveShadow = true;
  group.add(groundCover);
  const grassShape = new THREE.Shape();
  grassShape.moveTo(-0.035, 0);
  grassShape.lineTo(-0.025, 0.6);
  grassShape.lineTo(0.18, 1.15);
  grassShape.lineTo(0.06, 0.55);
  grassShape.lineTo(0.035, 0);
  grassShape.closePath();
  const grass = new THREE.InstancedMesh(
    new THREE.ShapeGeometry(grassShape),
    new THREE.MeshStandardMaterial({
      color: "#919b69",
      side: THREE.DoubleSide,
      roughness: 1,
    }),
    600,
  );
  grass.name = "outer-dune-grasses";
  grass.castShadow = false;
  group.add(grass);
  const transform = new THREE.Object3D(),
    tint = new THREE.Color();
  for (let i = 0; i < 90; i++) {
    const [x, z] = outerPoint();
    const y = groundAt(x, z);
    for (let j = 0; j < 6; j++) {
      transform.position.set(
        x + Math.cos(j) * 0.6,
        y + 0.1,
        z + Math.sin(j) * 0.6,
      );
      transform.rotation.set(0, j * 1.4, 0);
      transform.scale.set(
        range(0.45, 0.85),
        range(0.18, 0.32),
        range(0.65, 1.2),
      );
      transform.updateMatrix();
      groundCover.setMatrixAt(i * 6 + j, transform.matrix);
      groundCover.setColorAt(
        i * 6 + j,
        tint.setHSL(range(0.19, 0.25), 0.18, range(0.7, 1)),
      );
    }
  }
  for (let i = 0; i < 100; i++) {
    const [x, z] = outerPoint();
    const y = groundAt(x, z);
    for (let j = 0; j < 6; j++) {
      transform.position.set(x + range(-0.6, 0.6), y, z + range(-0.6, 0.6));
      transform.rotation.set(0, range(0, Math.PI * 2), range(-0.18, 0.18));
      const size = range(0.65, 1.3);
      transform.scale.setScalar(size);
      transform.updateMatrix();
      grass.setMatrixAt(i * 6 + j, transform.matrix);
    }
  }
  const petals = Array.from({ length: 5 }, (_, i) => {
    const geometry = new THREE.IcosahedronGeometry(0.09, 0);
    const angle = (i / 5) * Math.PI * 2;
    geometry.scale(1, 0.4, 1.2);
    geometry.translate(Math.cos(angle) * 0.09, 0, Math.sin(angle) * 0.09);
    return geometry;
  });
  const flowers = new THREE.InstancedMesh(
    mergeGeometries(petals),
    new THREE.MeshStandardMaterial({ color: "#fff0b6", roughness: 1 }),
    150,
  );
  flowers.name = "dune-wildflowers";
  group.add(flowers);
  petals.forEach((geometry) => geometry.dispose());
  for (let i = 0; i < 30; i++) {
    const [x, z] = outerPoint();
    const y = groundAt(x, z);
    for (let j = 0; j < 5; j++) {
      transform.position.set(
        x + range(-0.6, 0.6),
        y + 0.2,
        z + range(-0.6, 0.6),
      );
      transform.rotation.set(0, range(0, Math.PI * 2), 0);
      transform.scale.setScalar(range(1, 1.7));
      transform.updateMatrix();
      flowers.setMatrixAt(i * 5 + j, transform.matrix);
      flowers.setColorAt(i * 5 + j, tint.set(i % 3 ? "#fff3cd" : "#d7acd8"));
    }
  }
  for (let i = 0; i < 22; i++) {
    const [x, z] = outerPoint();
    const stone = ball(
      range(0.5, 1.5),
      i % 2 ? "#a3a395" : "#b3a894",
      x,
      groundAt(x, z) + 0.2,
      z,
      group,
    );
    stone.name = "outer-dune-rock";
    stone.scale.set(1.5, 0.65, 1);
    stone.castShadow = false;
  }
  return {
    group,
    palms,
    dunes,
    grass,
    groundCover,
    flowers,
    visibility,
    update(time) {
      palms.forEach(({ crowns, phase }) =>
        crowns.forEach((crown, i) => {
          crown.rotation.z =
            Math.sin(time * 0.65 + phase) * 0.035 +
            Math.sin(time * 1.3 + phase + i) * 0.009;
          crown.rotation.x = Math.sin(time * 0.47 + phase) * 0.025;
        }),
      );
    },
  };
}
