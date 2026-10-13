import * as THREE from "three";

const PER_FRIEND = 10;
// How far a heart drifts outward for each unit it rises: the cone's slope.
const CONE_SPREAD = 0.55;

// A small puffy 3D heart, centred on its middle.
function heartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.12);
  shape.bezierCurveTo(-0.3, 0.48, -0.65, 0.04, 0, -0.48);
  shape.bezierCurveTo(0.65, 0.04, 0.3, 0.48, 0, 0.12);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 10,
  }).center();
}

// When the friends bump into each other, hearts rise from both of them in
// a widening cone, spinning, and each vanishes at its own height.
export function createHearts(scene, { capacity = 96 } = {}) {
  const mesh = new THREE.InstancedMesh(
    heartGeometry(),
    new THREE.MeshStandardMaterial({
      roughness: 0.45,
      emissive: "#ff3d7a",
      emissiveIntensity: 0.25,
    }),
    capacity,
  );
  mesh.name = "contact-hearts";
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  const colors = ["#ff598b", "#ffabc9", "#ff7aa8"].map(
    (c) => new THREE.Color(c),
  );
  // Create the per-heart colours up front, so the shader includes them.
  mesh.setColorAt(0, colors[0]);
  mesh.count = 0;
  scene.add(mesh);
  const hearts = [];
  const transform = new THREE.Object3D();
  let touching = false,
    cooldown = 0;
  function clear() {
    hearts.length = 0;
    mesh.count = 0;
    touching = false;
    cooldown = 0;
  }
  function spawn(position) {
    for (let i = 0; i < PER_FRIEND; i++) {
      if (hearts.length >= capacity) hearts.shift();
      const angle = (i / PER_FRIEND) * Math.PI * 2 + Math.random() * 0.6,
        rise = 1.1 + Math.random() * 0.8,
        outward = rise * CONE_SPREAD * (0.6 + Math.random() * 0.8);
      hearts.push({
        position: new THREE.Vector3(
          position.x,
          position.y + 2.5 + Math.random() * 0.3,
          position.z,
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle) * outward,
          rise,
          Math.sin(angle) * outward,
        ),
        // Each heart vanishes at its own height up the cone.
        life: 0.9 + Math.random() * 1.6,
        yaw: Math.random() * Math.PI * 2,
        spin: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3),
        tilt: (Math.random() - 0.5) * 0.6,
        size: 0.32 + Math.random() * 0.18,
        color: colors[(hearts.length + i) % colors.length],
        age: 0,
      });
    }
  }
  function contact(bumped, woman, man) {
    if (bumped && !touching && cooldown <= 0) {
      cooldown = 1.5;
      spawn(woman);
      spawn(man);
    }
    if (bumped) touching = true;
    else if (Math.hypot(woman.x - man.x, woman.z - man.z) > 1.4)
      touching = false;
  }
  function update(dt) {
    cooldown = Math.max(0, cooldown - dt);
    for (let i = hearts.length - 1; i >= 0; i--) {
      const heart = hearts[i];
      heart.age += dt;
      if (heart.age >= heart.life) {
        hearts.splice(i, 1);
        continue;
      }
      heart.position.addScaledVector(heart.velocity, dt);
      heart.yaw += heart.spin * dt;
    }
    hearts.forEach((heart, i) => {
      const grow = Math.min(1, heart.age * 8),
        fade = Math.min(1, (heart.life - heart.age) * 4);
      transform.position.copy(heart.position);
      transform.rotation.set(heart.tilt, heart.yaw, heart.tilt * 0.5);
      transform.scale.setScalar(heart.size * grow * fade);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      mesh.setColorAt(i, heart.color);
    });
    mesh.count = hearts.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  return { contact, update, clear, hearts };
}
