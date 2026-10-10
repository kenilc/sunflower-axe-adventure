import * as THREE from "three";

const WAVE_SEGMENTS = 256;

function ribbonGeometry() {
  const segments = WAVE_SEGMENTS,
    positions = new Float32Array((segments + 1) * 6),
    indices = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setIndex(indices);
  return geometry;
}

export function createBeachAmbience({ parent, helpers }) {
  const { mesh, ball, cyl } = helpers;
  let elapsed = 0;
  const waves = [];
  for (let i = 0; i < 4; i++) {
    const swell = mesh(
      ribbonGeometry(),
      new THREE.MeshBasicMaterial({
        color: "#86c8cb",
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      0,
      0,
      0,
      parent,
    );
    const foam = mesh(
      ribbonGeometry(),
      new THREE.MeshBasicMaterial({
        color: "#fff4e2",
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      0,
      0,
      0,
      parent,
    );
    swell.name = `shore-wave-${i}`;
    foam.name = `shore-foam-${i}`;
    swell.castShadow = foam.castShadow = false;
    swell.frustumCulled = foam.frustumCulled = false;
    waves.push({ swell, foam });
  }
  const feather = new THREE.MeshStandardMaterial({
    color: "#faf4e7",
    roughness: 0.85,
  });
  const wingTip = new THREE.MeshStandardMaterial({
    color: "#667887",
    roughness: 0.9,
  });
  function wingGeometry(tip = false) {
    const shape = new THREE.Shape();
    const points = tip
      ? [
          [0.85, 0.06],
          [1.22, -0.08],
          [0.98, -0.34],
          [0.73, -0.2],
        ]
      : [
          [0, 0.12],
          [0.46, 0.26],
          [0.9, 0.13],
          [1.22, -0.08],
          [0.98, -0.34],
          [0.48, -0.14],
          [0, -0.18],
        ];
    shape.moveTo(...points[0]);
    points.slice(1).forEach((point) => shape.lineTo(...point));
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }
  feather.side = wingTip.side = THREE.DoubleSide;
  const wing = wingGeometry(),
    tip = wingGeometry(true);
  function gull() {
    const bird = new THREE.Group();
    bird.name = "seaside-gull";
    parent.add(bird);
    const body = ball(0.22, feather, 0, 0, 0, bird);
    body.scale.set(0.85, 0.8, 1.65);
    const head = new THREE.Group();
    head.position.set(0, 0.16, 0.27);
    bird.add(head);
    ball(0.135, feather, 0, 0, 0, head);
    const beak = cyl(0, 0.065, 0.2, "#dba05c", 0, -0.015, 0.19, head, 5);
    beak.rotation.x = Math.PI / 2;
    for (const side of [-1, 1])
      ball(0.021, "#303d46", side * 0.11, 0.02, 0.055, head);
    const wings = [];
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(side * 0.12, 0.025, 0);
      hinge.scale.x = side;
      bird.add(hinge);
      mesh(wing, feather, 0, 0, 0, hinge);
      mesh(tip, wingTip, 0, 0.008, 0, hinge);
      wings.push(hinge);
    }
    const tail = ball(0.16, wingTip, 0, -0.01, -0.36, bird);
    tail.scale.set(1, 0.25, 1.1);
    bird.traverse((node) => {
      if (node.isMesh) node.castShadow = false;
    });
    return { bird, wings, head };
  }
  const birds = Array.from({ length: 7 }, () => gull());
  const shoreBirds = Array.from({ length: 3 }, (_, i) => {
    const entry = gull();
    entry.bird.scale.setScalar(0.65);
    for (const side of [-1, 1]) {
      cyl(
        0.025,
        0.025,
        0.23,
        "#dba05c",
        side * 0.12,
        -0.22,
        0.04,
        entry.bird,
        5,
      );
      const foot = ball(0.065, "#dba05c", side * 0.12, -0.34, 0.11, entry.bird);
      foot.scale.set(1, 0.3, 1.5);
    }
    entry.bird.name = `tide-line-gull-${i}`;
    entry.wings.forEach((hinge, j) => {
      hinge.scale.set((j ? 1 : -1) * 0.45, 1, 0.65);
      hinge.rotation.z = (j ? 1 : -1) * -1.1;
    });
    return entry;
  });
  function render() {
    waves.forEach(({ swell, foam }, i) => {
      const phase = (elapsed / 7.5 + i / waves.length) % 1;
      const edge = -30 + phase * 12.9;
      const strength = Math.sin(Math.PI * phase);
      swell.material.opacity = strength * 0.56;
      foam.material.opacity = Math.min(1, strength * 2) * 0.85;
      for (const [surface, foamy] of [
        [swell, false],
        [foam, true],
      ]) {
        const positions = surface.geometry.attributes.position;
        for (let j = 0; j <= WAVE_SEGMENTS; j++) {
          const x = -600 + (j / WAVE_SEGMENTS) * 1200;
          const curve =
            Math.sin(x * 0.16) * 0.55 +
            Math.sin(x * 0.48 + elapsed * 0.5 + i) * 0.12;
          const width = foamy
            ? 0.18 + phase * 0.5 + Math.sin(x * 0.8 + i) * 0.07
            : 2.1;
          for (let side = 0; side < 2; side++) {
            const z = edge + curve - side * width;
            const y = foamy
              ? 0.1 + strength * 0.15
              : side === 0
                ? 0.06 + strength * 0.16
                : -0.06;
            positions.setXYZ(j * 2 + side, x, y, z);
          }
        }
        positions.needsUpdate = true;
      }
    });
    birds.forEach(({ bird, wings }, i) => {
      const phase = elapsed * (0.13 + i * 0.007) + i * 0.85;
      const radius = 23 + i * 1.6;
      bird.position.set(
        Math.sin(phase) * radius,
        8 + i * 0.65 + Math.sin(phase * 2) * 0.7,
        -34 - i * 4 + Math.cos(phase) * 8,
      );
      bird.rotation.set(
        0,
        Math.atan2(Math.cos(phase) * radius, -Math.sin(phase) * 8),
        Math.sin(phase) * 0.12,
      );
      const flap = Math.sin(elapsed * 4.8 + i) * 0.48;
      const gliding = Math.sin(elapsed * 0.55 + i) > 0.5;
      wings.forEach((hinge, j) => {
        hinge.rotation.z = (j ? 1 : -1) * (gliding ? 0.12 : 0.12 + flap);
      });
    });
    shoreBirds.forEach(({ bird, head }, i) => {
      const step = elapsed * 0.7 + i * 2;
      bird.position.set(
        -20 + i * 19 + Math.sin(step * 0.3) * 2,
        0.22 + Math.abs(Math.sin(step * 3)) * 0.015,
        -20.1 + Math.cos(step * 0.4) * 0.35,
      );
      bird.rotation.y = Math.cos(step * 0.3) > 0 ? Math.PI / 2 : -Math.PI / 2;
      head.rotation.x = Math.max(0, Math.sin(step * 1.7)) * 0.75;
    });
  }
  render();
  return {
    waves,
    birds,
    shoreBirds,
    update(dt) {
      elapsed += dt;
      render();
    },
  };
}
