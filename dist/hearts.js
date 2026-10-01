import * as THREE from "./vendor/three.module.js";

export function createHearts(scene) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.12);
  shape.bezierCurveTo(-0.3, 0.48, -0.65, 0.04, 0, -0.48);
  shape.bezierCurveTo(0.65, 0.04, 0.3, 0.48, 0, 0.12);
  const geometry = new THREE.ShapeGeometry(shape);
  const hearts = [];
  let touching = false,
    cooldown = 0;
  function clear() {
    hearts.forEach(({ mesh }) => {
      scene.remove(mesh);
      mesh.material.dispose();
    });
    hearts.length = 0;
    touching = false;
    cooldown = 0;
  }
  function contact(bumped, woman, man) {
    if (bumped && !touching && cooldown <= 0) {
      cooldown = 1.5;
      for (const position of [woman, man]) {
        for (let i = 0; i < 3; i++) {
          const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
              color: i % 2 ? "#ffabc9" : "#ff598b",
              side: THREE.DoubleSide,
              transparent: true,
              depthWrite: false,
            }),
          );
          mesh.position.copy(position);
          mesh.position.y = position.y + 2.85 + i * 0.2;
          mesh.position.x += (i - 1) * 0.35;
          scene.add(mesh);
          hearts.push({ mesh, age: 0, drift: (i - 1) * 0.25 });
        }
      }
    }
    if (bumped) touching = true;
    else if (Math.hypot(woman.x - man.x, woman.z - man.z) > 1.4)
      touching = false;
  }
  function update(dt, camera) {
    cooldown = Math.max(0, cooldown - dt);
    for (let i = hearts.length - 1; i >= 0; i--) {
      const heart = hearts[i];
      heart.age += dt;
      heart.mesh.position.y += dt * 0.85;
      heart.mesh.position.x += dt * heart.drift;
      heart.mesh.quaternion.copy(camera.quaternion);
      heart.mesh.scale.setScalar(0.55 * Math.min(1, heart.age * 7));
      heart.mesh.material.opacity = Math.min(1, (1.8 - heart.age) * 2);
      if (heart.age >= 1.8) {
        scene.remove(heart.mesh);
        heart.mesh.material.dispose();
        hearts.splice(i, 1);
      }
    }
  }
  return { contact, update, clear };
}
