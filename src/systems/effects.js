import * as THREE from "three";

export function createEffects({ scene, box, rand }) {
  const axes = [],
    particles = [];
  function burst(pos, c, n = 14) {
    for (let i = 0; i < n; i++) {
      const m = box(0.09, 0.09, 0.09, c, pos.x, pos.y, pos.z);
      particles.push({
        m,
        v: new THREE.Vector3(
          (rand() - 0.5) * 5,
          rand() * 4 + 1,
          (rand() - 0.5) * 5,
        ),
        life: 0.7 + rand() * 0.4,
      });
    }
  }
  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.life -= dt;
      p.v.y -= 8 * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += dt * 3;
      p.m.scale.setScalar(Math.min(1, p.life * 3));
      if (p.life < 0) {
        scene.remove(p.m);
        p.m.geometry.dispose();
        particles.splice(i, 1);
      }
    }
  }
  function clearProjectiles() {
    axes.forEach((a) => scene.remove(a.g));
    axes.length = 0;
  }
  function clearParticles() {
    particles.forEach((p) => {
      scene.remove(p.m);
      p.m.geometry.dispose();
    });
    particles.length = 0;
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
    burst,
    update,
    updateProjectiles,
    clearProjectiles,
    clearParticles,
  };
}
