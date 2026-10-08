import * as THREE from "three";

export const creekCenter = (z) =>
  -7 + (z + 36) * 0.15 + Math.sin((z + 36) * 0.065) * 0.35;

// Keep the inhabited terrace level, then ease down into the valley instead of
// stacking boxes. Both patches sample this surface at their shared boundary.
export function meadowHeight(x, z) {
  const distance = Math.hypot(
    Math.max(0, Math.abs(x) - 39),
    Math.max(0, -9 - z, z - 34),
  );
  const blend = THREE.MathUtils.smoothstep(distance, 0, 22);
  let height = THREE.MathUtils.lerp(-0.03, -5, blend);
  // Lower the stream bed through the foothills; water must stay above it.
  const channel =
    (1 - THREE.MathUtils.smoothstep(Math.abs(x - creekCenter(z)), 3.5, 6)) *
    (1 - THREE.MathUtils.smoothstep(z, -11, -9)) *
    THREE.MathUtils.smoothstep(z, -83, -76);
  height = THREE.MathUtils.lerp(height, -5, channel);
  return height;
}

export function createVillageMeadow({ mesh, parent, north, south, name }) {
  const vertices = [],
    indices = [];
  const columns = 100,
    rows = Math.ceil((south - north) / 2);
  for (let row = 0; row <= rows; row++) {
    const z = THREE.MathUtils.lerp(north, south, row / rows);
    for (let column = 0; column <= columns; column++) {
      const x = -100 + column * 2;
      vertices.push(x, meadowHeight(x, z), z);
    }
  }
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column,
        b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ground = mesh(geometry, "#83a87a", 0, 0, 0, parent);
  ground.name = name;
  // Sample the actual triangle directly when planting grass. Ray-testing the
  // entire grid for every blade makes scene construction needlessly slow.
  ground.userData.sampleGround = (x, z) => {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      x < -100 ||
      x > 100 ||
      z < north ||
      z > south
    )
      return null;
    const column = THREE.MathUtils.clamp(
      Math.floor((x + 100) / 2),
      0,
      columns - 1,
    );
    const row = THREE.MathUtils.clamp(
      Math.floor(((z - north) / (south - north)) * rows),
      0,
      rows - 1,
    );
    const u = (x + 100) / 2 - column;
    const v = ((z - north) / (south - north)) * rows - row;
    const a = row * (columns + 1) + column,
      b = a + columns + 1;
    const corners = u + v <= 1 ? [a, b, a + 1] : [a + 1, b, b + 1];
    const [p, q, r] = corners.map((index) =>
      new THREE.Vector3().fromBufferAttribute(
        geometry.attributes.position,
        index,
      ),
    );
    const normal = q.clone().sub(p).cross(r.clone().sub(p)).normalize();
    const y = p.y - (normal.x * (x - p.x) + normal.z * (z - p.z)) / normal.y;
    return {
      object: ground,
      point: new THREE.Vector3(x, y, z),
      face: { normal },
    };
  };
  return ground;
}
