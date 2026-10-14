import * as THREE from "three";
import { creekCenter } from "./terrain.js";

// Continuous colour variation breaks up the large rock facets without textures.
export function alpineTint(point, normal, meadow = false) {
  const patch =
    Math.sin(point.x * 0.31 + Math.sin(point.z * 0.17) * 2) *
    Math.cos(point.z * 0.23 - point.y * 0.13);
  const rock = meadow
    ? 0
    : THREE.MathUtils.clamp(
        (1 - normal.y) * 0.85 +
          patch * 0.45 +
          THREE.MathUtils.smoothstep(point.y, 35, 57) * 0.35,
        0,
        0.9,
      );
  return new THREE.Color(point.y > 40 ? "#8fa76a" : "#799b58")
    .lerp(new THREE.Color("#9c9e8c"), rock)
    .multiplyScalar(0.94 + patch * 0.07);
}

export function createAlpineDetails({
  parent,
  surfaces,
  trailDistance,
  grassAllowed,
  lookout,
}) {
  let seed = 8317;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const group = new THREE.Group();
  group.name = "alpine-rocks-and-wildflowers";
  parent.add(group);
  const sampled = surfaces.filter((source) => source.userData.sampleGround);
  const obstacles = surfaces.filter((source) => !source.userData.sampleGround);
  const ray = new THREE.Raycaster();
  function groundAt(x, z) {
    ray.set(new THREE.Vector3(x, 150, z), new THREE.Vector3(0, -1, 0));
    let hit = ray.intersectObjects(obstacles, false)[0];
    for (const source of sampled) {
      const candidate = source.userData.sampleGround(x, z);
      if (candidate && (!hit || candidate.point.y > hit.point.y))
        hit = candidate;
    }
    return hit;
  }
  const sites = [],
    batches = [];
  function batch(name, geometry, color, locations) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 1,
      }),
      locations.length,
    );
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    const transform = new THREE.Object3D();
    for (const [index, site] of locations.entries()) {
      transform.position.copy(site.point);
      transform.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        site.normal,
      );
      transform.rotateY(site.angle);
      transform.scale.setScalar(site.size);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      sites.push({
        ...site,
        mesh,
        index,
        matrix: transform.matrix.clone(),
        hidden: false,
      });
    }
    mesh.computeBoundingSphere();
    group.add(mesh);
    batches.push(mesh);
  }
  // The foothills by default; the lower meadow passes its own bounds.
  function scatter(count, kind, [minX, maxX, minZ, maxZ] = [-78, 82, -78, 35]) {
    const locations = [];
    for (
      let attempt = 0;
      attempt < count * 50 && locations.length < count;
      attempt++
    ) {
      const x = THREE.MathUtils.lerp(minX, maxX, random()),
        z = THREE.MathUtils.lerp(minZ, maxZ, random());
      if (
        trailDistance(x, z) < 4 ||
        Math.hypot(x - lookout.x, z - lookout.z) < 6
      )
        continue;
      if (!grassAllowed(x, z)) continue;
      // Larger props stay off every walkable street, meadow and shop approach.
      if (kind !== "flowers" && Math.abs(x) < 37 && z > -9 && z < 36) continue;
      const hit = groundAt(x, z);
      if (
        !hit ||
        hit.point.y > 43 ||
        hit.point.y < -5.1 ||
        hit.face.normal.y < 0.45
      )
        continue;
      locations.push({
        point: hit.point.clone(),
        normal: hit.face.normal.clone(),
        source: hit.object,
        size: kind === "rocks" ? 0.6 + random() * 1.3 : 0.45 + random() * 0.65,
        angle: random() * Math.PI * 2,
      });
    }
    return locations;
  }
  // The lower meadow runs from the terrace down to the board's edge.
  const lowerMeadow = [-94, 94, -7, 94];
  const rocks = [
    ...scatter(240, "rocks"),
    ...scatter(90, "rocks", lowerMeadow),
  ];
  const shrubs = [
    ...scatter(180, "shrubs"),
    ...scatter(50, "shrubs", lowerMeadow),
  ];
  batch(
    "alpine-foothill-boulders",
    new THREE.IcosahedronGeometry(1, 0)
      .scale(0.7, 0.45, 0.8)
      .translate(0, 0.15, 0),
    "#a6a58e",
    rocks,
  );
  batch(
    "alpine-juniper-shrubs",
    new THREE.IcosahedronGeometry(1, 1)
      .scale(0.7, 0.45, 0.8)
      .translate(0, 0.35, 0),
    "#65866a",
    shrubs,
  );
  // Rocks and shrubs where the characters can walk block them.
  const blocking = [...rocks, ...shrubs]
    .filter((site) => site.point.z >= -7)
    .map((site) => ({ x: site.point.x, z: site.point.z, r: site.size * 0.75 }));
  const flowers = [
    ...scatter(280, "flowers"),
    ...scatter(160, "flowers", lowerMeadow),
  ];
  batch(
    "alpine-wildflower-stems",
    new THREE.CylinderGeometry(0.025, 0.035, 0.65, 4).translate(0, 0.325, 0),
    "#56754d",
    flowers,
  );
  for (const [index, tint] of ["#f2dc96", "#dfc8df", "#eee9d5"].entries())
    batch(
      "alpine-wildflower-blooms",
      new THREE.IcosahedronGeometry(0.16, 1)
        .scale(1, 0.5, 1)
        .translate(0, 0.65, 0),
      tint,
      flowers.filter((_, i) => i % 3 === index),
    );
  const stones = [],
    reeds = [];
  for (let z = -74; z < -17; z += 2)
    for (const side of [-1, 1]) {
      for (const [offset, collection] of [
        [1.9, stones],
        [3.3, reeds],
      ]) {
        const hit = groundAt(
          creekCenter(z) + side * (offset + random() * 0.5),
          z,
        );
        if (
          !hit ||
          hit.face.normal.y < 0.4 ||
          trailDistance(hit.point.x, z) < 3
        )
          continue;
        collection.push({
          point: hit.point.clone(),
          normal: hit.face.normal.clone(),
          source: hit.object,
          size: 0.45 + random() * 0.55,
          angle: random() * Math.PI * 2,
        });
      }
    }
  batch(
    "alpine-stream-stones",
    new THREE.IcosahedronGeometry(1, 0)
      .scale(0.45, 0.28, 0.6)
      .translate(0, 0.12, 0),
    "#9caaa0",
    stones,
  );
  const reed = new THREE.ConeGeometry(0.1, 1.8, 4).translate(0, 0.85, 0);
  batch("alpine-stream-reeds", reed, "#879657", reeds);
  const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    group,
    sites,
    batches,
    obstacles: blocking,
    updateVisibility() {
      for (const site of sites) {
        const hidden = site.source.material.opacity < 0.45;
        if (hidden === site.hidden) continue;
        site.hidden = hidden;
        site.mesh.setMatrixAt(site.index, hidden ? hiddenMatrix : site.matrix);
        site.mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
