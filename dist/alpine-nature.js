import * as THREE from "./vendor/three.module.js";

// Batch the woodland and birds so dense scenery stays inexpensive to draw.
export function createAlpineNature({
  parent,
  surfaces,
  trailDistance,
  lookout,
  meadowSurfaces = [],
  grassAllowed = () => true,
  treeAllowed = () => true,
}) {
  let seed = 48071;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const forest = new THREE.Group();
  forest.name = "alpine-mountain-forest";
  parent.add(forest);
  parent.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0),
    hits = [];
  const normalMatrix = new THREE.Matrix3();
  function groundAt(x, z) {
    ray.set(new THREE.Vector3(x, 150, z), down);
    hits.length = 0;
    ray.intersectObjects(surfaces, false, hits);
    return hits[0];
  }
  function merge(parts) {
    const positions = [],
      normals = [];
    for (const part of parts) {
      const geometry = part.index ? part.toNonIndexed() : part;
      positions.push(...geometry.attributes.position.array);
      normals.push(...geometry.attributes.normal.array);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    return geometry;
  }
  const species = [
    {
      name: "spruce",
      color: "#3d7358",
      width: 1,
      height: 5.8,
      parts: [0, 1, 2, 3].map((i) =>
        new THREE.ConeGeometry(1.4 - i * 0.25, 2.4, 7).translate(
          0,
          2.3 + i * 0.78,
          0,
        ),
      ),
    },
    {
      name: "pine",
      color: "#66874c",
      width: 1.8,
      height: 4.8,
      parts: [0, 1, 2].map((i) =>
        new THREE.IcosahedronGeometry(1, 0)
          .scale(1.5, 0.78, 1.35)
          .translate(
            Math.cos(i * 2.1) * 0.6,
            3.9 + i * 0.14,
            Math.sin(i * 2.1) * 0.6,
          ),
      ),
    },
    {
      name: "fir",
      color: "#426e65",
      width: 0.85,
      height: 6.5,
      parts: [
        new THREE.ConeGeometry(1.2, 5.6, 6).translate(0, 3.7, 0),
        new THREE.ConeGeometry(0.9, 3.6, 6).translate(0, 4.8, 0),
      ],
    },
    {
      name: "birch",
      color: "#9daa61",
      width: 1.45,
      height: 5.1,
      parts: [0, 1, 2].map((i) =>
        new THREE.IcosahedronGeometry(1, 1)
          .scale(1.05, 1.5, 0.9)
          .translate(
            Math.cos(i * 2.1) * 0.5,
            3.5 + i * 0.16,
            Math.sin(i * 2.1) * 0.5,
          ),
      ),
    },
  ];
  const trees = [],
    occupied = new Set(),
    perSpecies = 900;
  const color = new THREE.Color(),
    transform = new THREE.Object3D();
  function batch(name, geometry, tint, count) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: tint,
        flatShading: true,
        roughness: 0.95,
      }),
      count,
    );
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    forest.add(mesh);
    return mesh;
  }
  species.forEach((variety) => {
    const trunks = batch(
      variety.name + "-trunks",
      new THREE.CylinderGeometry(0.11, 0.21, 3.6, 5).translate(0, 1.8, 0),
      variety.name === "birch" ? "#e5dec1" : "#786049",
      perSpecies,
    );
    const crowns = batch(
      variety.name + "-crowns",
      merge(variety.parts),
      "#ffffff",
      perSpecies,
    );
    for (let i = 0; i < perSpecies; i++) {
      let site, size, width, key, groundSurface, groundNormal;
      for (let attempt = 0; attempt < 600; attempt++) {
        const x = -89 + random() * 186,
          z = -12 - random() * 132;
        if (!treeAllowed(x, z)) continue;
        const hit = groundAt(x, z);
        if (!hit || hit.point.y > 55 || hit.point.y < -5.1) continue;
        if (
          hit.object.name === "swiss-mountain" &&
          hit.point.y > hit.object.geometry.parameters.height * 0.7 - 7
        )
          continue;
        const normal = hit.face.normal
          .clone()
          .applyNormalMatrix(
            normalMatrix.getNormalMatrix(hit.object.matrixWorld),
          )
          .normalize();
        if (normal.y < 0.22) continue;
        size =
          (0.34 + Math.pow(random(), 0.8) * 1.3) * (hit.point.y > 38 ? 0.7 : 1);
        width = variety.width * size;
        if (
          trailDistance(x, z) < 4.3 + width ||
          Math.hypot(x - lookout.x, z - lookout.z) < 6 + width
        )
          continue;
        key = `${Math.round(x / 1.15)}:${Math.round(z / 1.15)}`;
        if (occupied.has(key)) continue;
        site = hit.point.clone();
        groundSurface = hit.object;
        groundNormal = normal;
        break;
      }
      if (!site) throw new Error("No grounded alpine forest planting site");
      occupied.add(key);
      const rootDepth = size * 0.2;
      transform.position.copy(site).y -= rootDepth;
      transform.rotation.set(0, random() * Math.PI * 2, 0);
      transform.scale.set(size * (0.85 + random() * 0.3), size, size);
      transform.updateMatrix();
      trunks.setMatrixAt(i, transform.matrix);
      crowns.setMatrixAt(i, transform.matrix);
      color.set(variety.color).multiplyScalar(0.78 + random() * 0.4);
      crowns.setColorAt(i, color);
      trees.push({
        site,
        rootDepth,
        groundSurface,
        groundNormal,
        size,
        width: width * 1.12,
        height: variety.height * size,
        species: variety.name,
        index: i,
        trunks,
        crowns,
        matrix: transform.matrix.clone(),
        hidden: false,
      });
    }
    for (const mesh of [trunks, crowns]) {
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
    }
  });
  forest.userData.treeCount = trees.length;
  forest.userData.varieties = species.map((s) => s.name);

  const grass = new THREE.Group();
  grass.name = "alpine-grassy-slopes";
  parent.add(grass);
  const grassCovers = [],
    grassBatches = [],
    grassSites = [],
    sidePlants = [];
  const grassSurfaces = [...surfaces, ...meadowSurfaces];
  const treeLine = (source) =>
    source.name === "swiss-mountain"
      ? source.geometry.parameters.height * 0.7 - 7
      : 56;
  // Fit a continuous green meadow to each rock face. Clip at the snowline
  // rather than putting a flat lawn through the mountain or its snowy peak.
  for (const source of grassSurfaces) {
    const geometry = source.geometry,
      positions = geometry.getAttribute("position"),
      indices = geometry.index;
    const vertices = [],
      colors = [];
    const count = indices ? indices.count : positions.count;
    for (let i = 0; i < count; i += 3) {
      let polygon = [0, 1, 2].map((j) =>
        new THREE.Vector3()
          .fromBufferAttribute(positions, indices ? indices.getX(i + j) : i + j)
          .applyMatrix4(source.matrixWorld),
      );
      const normal = polygon[1]
        .clone()
        .sub(polygon[0])
        .cross(polygon[2].clone().sub(polygon[0]))
        .normalize();
      if (normal.y < -0.01) continue;
      const clipped = [],
        limit = treeLine(source);
      for (let j = 0; j < polygon.length; j++) {
        const a = polygon[j],
          b = polygon[(j + 1) % polygon.length];
        if (a.y < limit) clipped.push(a);
        if (a.y < limit !== b.y < limit)
          clipped.push(a.clone().lerp(b, (limit - a.y) / (b.y - a.y)));
      }
      polygon = clipped;
      for (let j = 1; j < polygon.length - 1; j++) {
        if (normal.y < 0.22) {
          const a = polygon[0],
            b = polygon[j],
            c = polygon[j + 1];
          const area = b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
          for (let k = 0; k < Math.ceil(area * 0.55); k++) {
            const u = Math.sqrt(random()),
              v = random();
            const site = a
              .clone()
              .multiplyScalar(1 - u)
              .addScaledVector(b, u * (1 - v))
              .addScaledVector(c, u * v);
            if (
              trailDistance(site.x, site.z) > 2.7 &&
              grassAllowed(site.x, site.z)
            )
              sidePlants.push({
                site,
                normal,
                source,
                size: 0.3 + random() * 0.5,
              });
          }
        }
        for (const point of [polygon[0], polygon[j], polygon[j + 1]]) {
          const raised = point.clone().addScaledVector(normal, 0.025);
          vertices.push(...raised.toArray());
          const tint = new THREE.Color(point.y > 40 ? "#86a564" : "#739b55");
          tint.multiplyScalar(
            0.92 + Math.sin(point.x * 0.12 + point.z * 0.08) * 0.06,
          );
          colors.push(tint.r, tint.g, tint.b);
        }
      }
    }
    const meadowGeometry = new THREE.BufferGeometry();
    meadowGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    meadowGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    meadowGeometry.computeVertexNormals();
    const cover = new THREE.Mesh(
      meadowGeometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 1,
      }),
    );
    cover.name = "mountain-meadow-cover";
    cover.receiveShadow = true;
    grass.add(cover);
    grassCovers.push({ mesh: cover, source });
  }
  const tuftGeometry = new THREE.BufferGeometry();
  const blades = [];
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4,
      x = Math.cos(angle) * 0.15,
      z = Math.sin(angle) * 0.15;
    const height = 0.45 + (i % 3) * 0.1;
    blades.push(
      x - 0.05,
      0,
      z,
      x + 0.05,
      0,
      z,
      x + Math.cos(angle) * 0.12,
      height,
      z + Math.sin(angle) * 0.12,
    );
  }
  tuftGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(blades, 3),
  );
  tuftGeometry.computeVertexNormals();
  const planting = new Map(grassSurfaces.map((source) => [source, []]));
  for (const plant of sidePlants) planting.get(plant.source).push(plant);
  // Include a tuft around every trunk to make its planted base readable.
  for (const tree of trees)
    planting.get(tree.groundSurface).push({
      site: tree.site,
      normal: tree.groundNormal,
      size: Math.max(0.6, tree.size * 1.2),
    });
  for (let i = 0; i < 15000; i++) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const hit = groundAt(-89 + random() * 186, -12 - random() * 132);
      if (
        !hit ||
        hit.point.y >= treeLine(hit.object) ||
        trailDistance(hit.point.x, hit.point.z) < 2.7
      )
        continue;
      const normal = hit.face.normal
        .clone()
        .applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld))
        .normalize();
      if (normal.y < 0.22) continue;
      planting
        .get(hit.object)
        .push({ site: hit.point.clone(), normal, size: 0.35 + random() * 0.7 });
      break;
    }
  }
  // Continue the meadow over the village lawns and valley floor, leaving
  // the cobbles, gates, shop approaches and stream free of grass blades.
  const meadowRay = new THREE.Raycaster();
  for (const source of meadowSurfaces) {
    const bounds = new THREE.Box3().setFromObject(source);
    const isVillage = source.name === "alpine-village-ground";
    const count = isVillage
      ? 2400
      : source.name === "alpine-valley-ground"
        ? 12000
        : 90;
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const x = THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, random());
        const z = THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, random());
        if (!grassAllowed(x, z) || trailDistance(x, z) < 2.7) continue;
        meadowRay.set(new THREE.Vector3(x, 150, z), down);
        const hit = meadowRay.intersectObjects(grassSurfaces, false)[0];
        if (!hit || hit.object !== source) continue;
        const normal = hit.face.normal
          .clone()
          .applyNormalMatrix(normalMatrix.getNormalMatrix(source.matrixWorld))
          .normalize();
        if (normal.y < 0.22) continue;
        planting.get(source).push({
          site: hit.point.clone(),
          normal,
          size: isVillage ? 0.28 + random() * 0.4 : 0.4 + random() * 0.6,
        });
        break;
      }
    }
  }
  for (const [source, sites] of planting) {
    const tufts = new THREE.InstancedMesh(
      tuftGeometry,
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        roughness: 1,
        flatShading: true,
      }),
      sites.length,
    );
    tufts.name = "mountain-grass-tufts";
    tufts.receiveShadow = true;
    grass.add(tufts);
    sites.forEach((plant, i) => {
      transform.position.copy(plant.site).addScaledVector(plant.normal, 0.035);
      transform.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        plant.normal,
      );
      transform.rotateY(random() * Math.PI * 2);
      transform.scale.setScalar(plant.size);
      transform.updateMatrix();
      tufts.setMatrixAt(i, transform.matrix);
      color.set(["#789f4e", "#91ae59", "#598947", "#a1b865"][i % 4]);
      tufts.setColorAt(i, color);
      grassSites.push({ ...plant, source });
    });
    tufts.computeBoundingSphere();
    grassBatches.push({ mesh: tufts, source });
  }
  grass.userData.tuftCount = grassSites.length;

  // Flying silhouettes use just three instanced batches for all flocks.
  const birdGroup = new THREE.Group();
  birdGroup.name = "alpine-flying-birds";
  parent.add(birdGroup);
  const birdCount = 12;
  function birdBatch(geometry, tint, count, name) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: tint,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
      count,
    );
    mesh.name = name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    birdGroup.add(mesh);
    return mesh;
  }
  const bodies = birdBatch(
    new THREE.IcosahedronGeometry(1, 0).scale(0.16, 0.13, 0.4),
    "#f5f0dd",
    birdCount,
    "bird-bodies",
  );
  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [0, 0, 0, 0.6, 0, -0.28, 1.45, 0, 0.05, 0.7, 0, 0.22],
      3,
    ),
  );
  wingGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  wingGeometry.computeVertexNormals();
  const wings = birdBatch(wingGeometry, "#d8e3df", birdCount * 2, "bird-wings");
  const beaks = birdBatch(
    new THREE.ConeGeometry(0.07, 0.2, 4)
      .rotateX(Math.PI / 2)
      .translate(0, 0, 0.45),
    "#e3b96a",
    birdCount,
    "bird-beaks",
  );
  const flockSpecs = [
    { x: 0, z: -18, rx: 42, rz: 9, minY: 30, speed: 0.08 },
    { x: -24, z: -70, rx: 43, rz: 24, minY: 71, speed: -0.06 },
    { x: 38, z: -80, rx: 39, rz: 29, minY: 78, speed: 0.05 },
  ];
  for (const flock of flockSpecs) {
    for (let i = 0; i < 120; i++) {
      const angle = (i / 120) * Math.PI * 2;
      const ground = groundAt(
        flock.x + Math.cos(angle) * (flock.rx + 9),
        flock.z + Math.sin(angle) * (flock.rz + 9),
      );
      if (ground) flock.minY = Math.max(flock.minY, ground.point.y + 10);
    }
  }
  const birds = Array.from({ length: birdCount }, (_, i) => ({
    flock: flockSpecs[Math.floor(i / 4)],
    phase: (i % 4) * 1.57 + random() * 0.8,
    spread: (random() - 0.5) * 12,
    size: 0.38 + random() * 0.25,
    position: new THREE.Vector3(),
    flap: 0,
  }));
  // Check each bird's actual orbit after terrain changes, including its
  // individual radius, so it never glides through a higher part of the ridge.
  for (const bird of birds) {
    bird.altitude = bird.flock.minY + bird.spread;
    for (let i = 0; i < 180; i++) {
      const angle = (i / 180) * Math.PI * 2,
        f = bird.flock;
      const ground = groundAt(
        f.x + Math.cos(angle) * (f.rx + bird.spread),
        f.z + Math.sin(angle) * (f.rz + bird.spread),
      );
      if (ground) bird.altitude = Math.max(bird.altitude, ground.point.y + 8);
    }
  }
  const flight = new THREE.Object3D(),
    wing = new THREE.Object3D();
  flight.add(wing);
  let flightTime = 0;
  function update(dt) {
    flightTime += dt;
    birds.forEach((bird, i) => {
      const f = bird.flock,
        angle = flightTime * f.speed + bird.phase;
      bird.position.set(
        f.x + Math.cos(angle) * (f.rx + bird.spread),
        bird.altitude + Math.sin(angle * 2 + bird.phase) * 2,
        f.z + Math.sin(angle) * (f.rz + bird.spread),
      );
      const heading = Math.atan2(
        -Math.sin(angle) * f.rx * f.speed,
        Math.cos(angle) * f.rz * f.speed,
      );
      flight.position.copy(bird.position);
      flight.rotation.set(0.05, heading, Math.sin(angle) * 0.12);
      flight.scale.setScalar(bird.size);
      flight.updateMatrixWorld(true);
      bodies.setMatrixAt(i, flight.matrix);
      beaks.setMatrixAt(i, flight.matrix);
      const gliding = Math.sin(flightTime * 0.4 + bird.phase) > -0.15;
      bird.flap = gliding
        ? Math.sin(flightTime * 1.3 + bird.phase) * 0.1
        : Math.sin(flightTime * (4 + (i % 3)) + bird.phase * 9) * 0.45;
      for (const side of [-1, 1]) {
        wing.position.set(side * 0.1, 0.05, 0);
        wing.rotation.set(0, 0, bird.flap * side);
        wing.scale.set(side, 1, 1);
        wing.updateMatrixWorld(true);
        wings.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), wing.matrixWorld);
      }
    });
    bodies.instanceMatrix.needsUpdate =
      wings.instanceMatrix.needsUpdate =
      beaks.instanceMatrix.needsUpdate =
        true;
  }
  for (const birdMesh of [bodies, wings]) {
    birdMesh.material.emissive.set("#a8c0b9");
    birdMesh.material.emissiveIntensity = 0.25;
  }
  update(0);
  birdGroup.userData.birdCount = birdCount;

  // Hide only trees crossing the camera-to-character sightlines. Using zero
  // scale also removes their shadows, without thousands of material clones.
  const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  function updateVisibility(camera, characters) {
    const targets = characters.flatMap((character) =>
      [0.7, 1.6, 2.5].map((height) =>
        character.position.clone().add(new THREE.Vector3(0, height, 0)),
      ),
    );
    const origin = camera.position;
    for (const patch of [...grassCovers, ...grassBatches]) {
      const opacity = patch.source.material.opacity;
      patch.mesh.visible = opacity > 0.15;
      patch.mesh.material.opacity = opacity;
      const fading = opacity < 1;
      if (patch.mesh.material.transparent !== fading) {
        patch.mesh.material.transparent = fading;
        patch.mesh.material.needsUpdate = true;
      }
      patch.mesh.material.depthWrite = !fading;
    }
    for (const tree of trees) {
      const cx = tree.site.x,
        cy = tree.site.y + tree.height * 0.5,
        cz = tree.site.z;
      const radius = Math.hypot(tree.width, tree.height * 0.5) + 0.6;
      let hidden = tree.groundSurface.material.opacity < 0.45;
      for (const target of hidden ? [] : targets) {
        const dx = target.x - origin.x,
          dy = target.y - origin.y,
          dz = target.z - origin.z;
        const t = THREE.MathUtils.clamp(
          ((cx - origin.x) * dx + (cy - origin.y) * dy + (cz - origin.z) * dz) /
            (dx * dx + dy * dy + dz * dz),
          0,
          1,
        );
        if (
          (cx - origin.x - t * dx) ** 2 +
            (cy - origin.y - t * dy) ** 2 +
            (cz - origin.z - t * dz) ** 2 <
          radius * radius
        ) {
          hidden = true;
          break;
        }
      }
      if (hidden === tree.hidden) continue;
      tree.hidden = hidden;
      for (const mesh of [tree.trunks, tree.crowns]) {
        mesh.setMatrixAt(tree.index, hidden ? hiddenMatrix : tree.matrix);
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }
  return {
    forest,
    trees,
    grass,
    grassCovers,
    grassSites,
    meadowSurfaces,
    grassSurfaces,
    birdGroup,
    birds,
    surfaces,
    update,
    updateVisibility,
  };
}
