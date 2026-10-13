import * as THREE from "three";

// A soft round dot that fades to its edge, shared by every burst.
function softDot() {
  const size = 32,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - 15.5, y - 15.5) / 15.5;
      pixels.set(
        [255, 255, 255, Math.round(Math.max(0, 1 - r * r) ** 1.5 * 255)],
        (y * size + x) * 4,
      );
    }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.needsUpdate = true;
  return texture;
}

export function createEffects({ scene, rand, capacity = 600 }) {
  const axes = [],
    particles = [];
  // Every burst shares one point cloud: one draw call, no per-particle
  // geometry, and each particle fades out instead of popping.
  const positions = new Float32Array(capacity * 3),
    colors = new Float32Array(capacity * 4);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  geometry.setDrawRange(0, 0);
  const cloud = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.55,
      map: softDot(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    }),
  );
  cloud.name = "burst-particles";
  cloud.frustumCulled = false;
  scene.add(cloud);
  const color = new THREE.Color();
  function burst(pos, c, n = 14) {
    color.set(c);
    for (let i = 0; i < n; i++) {
      // Drop the oldest particles if a big burst would overflow the pool.
      if (particles.length >= capacity) particles.shift();
      const life = 0.7 + rand() * 0.4;
      particles.push({
        position: new THREE.Vector3(pos.x, pos.y, pos.z),
        v: new THREE.Vector3(
          (rand() - 0.5) * 5,
          rand() * 4 + 1,
          (rand() - 0.5) * 5,
        ),
        life,
        maxLife: life,
        color: color.clone(),
      });
    }
  }
  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life < 0) {
        particles.splice(i, 1);
        continue;
      }
      p.v.y -= 8 * dt;
      p.position.addScaledVector(p.v, dt);
    }
    particles.forEach((p, i) => {
      p.position.toArray(positions, i * 3);
      colors.set(
        [
          p.color.r,
          p.color.g,
          p.color.b,
          Math.min(1, (p.life / p.maxLife) * 2),
        ],
        i * 4,
      );
    });
    geometry.setDrawRange(0, particles.length);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }
  function clearProjectiles() {
    axes.forEach((a) => scene.remove(a.g));
    axes.length = 0;
  }
  function clearParticles() {
    particles.length = 0;
    geometry.setDrawRange(0, 0);
  }
  function updateProjectiles(dt, targets = [], onHit) {
    for (let index = axes.length - 1; index >= 0; index--) {
      const axe = axes[index];
      axe.life -= dt;
      axe.g.position.addScaledVector(axe.dir, dt * 19);
      axe.g.rotation.x += dt * 18;
      axe.g.rotation.z += dt * 6;
      for (const target of targets)
        if (!target.hit && axe.g.position.distanceTo(target.pos) < 0.93) {
          target.hit = true;
          target.blocker.active = false;
          target.g.visible = false;
          onHit?.(target);
          axe.life = 0;
          break;
        }
      if (axe.life <= 0) {
        scene.remove(axe.g);
        axes.splice(index, 1);
      }
    }
  }
  return {
    axes,
    particles,
    burst,
    update,
    updateProjectiles,
    clearProjectiles,
    clearParticles,
  };
}
