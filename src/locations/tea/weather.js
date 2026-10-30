import * as THREE from "three";
import { createRandom } from "../../systems/random.js";

// A soft rainy afternoon in the tea hills.
export const RAIN_ENVIRONMENT = {
  background: "#b9c9bd",
  skyTop: "#8fa59a",
  fogDensity: 0.024,
  sunIntensity: 1.3,
  sunColor: "#e6efe6",
  sunOffset: [-10, 30, 14],
  fillIntensity: 2.6,
  fillColor: "#dfe9e0",
  groundColor: "#4a5a4c",
  exposure: 1.12,
};
// After tea the rain stops: a washed blue sky and warm low sun.
export const CLEAR_ENVIRONMENT = {
  background: "#d6e8dc",
  skyTop: "#7fb6dc",
  fogDensity: 0.011,
  sunIntensity: 3.1,
  sunColor: "#fff0c8",
  sunOffset: [-16, 24, 18],
  fillIntensity: 2.3,
  fillColor: "#fff6dc",
  groundColor: "#4f6a4c",
  exposure: 1.2,
};
const CLEAR_SECONDS = 6;
const DROPS = 700,
  SPREAD = 17,
  HEIGHT = 15;
const COLOR_KEYS = [
  "background",
  "skyTop",
  "sunColor",
  "fillColor",
  "groundColor",
];
const NUMBER_KEYS = ["fogDensity", "sunIntensity", "fillIntensity", "exposure"];

function blend(from, to, t) {
  const next = {};
  for (const key of COLOR_KEYS)
    next[key] =
      `#${new THREE.Color(from[key]).lerp(new THREE.Color(to[key]), t).getHexString()}`;
  for (const key of NUMBER_KEYS)
    next[key] = from[key] + (to[key] - from[key]) * t;
  next.sunOffset = from.sunOffset.map(
    (value, i) => value + (to.sunOffset[i] - value) * t,
  );
  return next;
}

// A rainbow as a half ring with soft colour bands, drawn without fog so it
// shows across the valley.
function createRainbow() {
  const inner = 58,
    outer = 66;
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      opacity: { value: 0 },
      inner: { value: inner },
      outer: { value: outer },
    },
    vertexShader: `
      varying float band;
      uniform float inner;
      uniform float outer;
      void main() {
        band = (length(position.xy) - inner) / (outer - inner);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying float band;
      uniform float opacity;
      vec3 hue(float h) {
        vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return mix(vec3(1.0), k, 0.55);
      }
      void main() {
        float edge = smoothstep(0.0, 0.18, band) * smoothstep(1.0, 0.82, band);
        gl_FragColor = vec4(hue((1.0 - band) * 0.78), edge * opacity);
      }`,
  });
  const rainbow = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 128, 1, 0, Math.PI),
    material,
  );
  rainbow.name = "tea-rainbow";
  rainbow.frustumCulled = false;
  rainbow.renderOrder = -1;
  rainbow.visible = false;
  return rainbow;
}

// The rain, the ripples it makes in puddles, and the clearing after tea.
// `clear()` starts the rain stopping; `reset()` brings it back.
export function createWeather(context, { group, world }) {
  const rand = createRandom(7741);
  const drop = new THREE.Object3D();
  const dropMaterial = new THREE.MeshBasicMaterial({
    color: "#e4edf2",
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const rain = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.022, 0.6, 0.022),
    dropMaterial,
    DROPS,
  );
  rain.name = "tea-rain";
  rain.frustumCulled = false;
  rain.castShadow = rain.receiveShadow = false;
  group.add(rain);
  const wind = 1.4;
  const drops = Array.from({ length: DROPS }, () => ({
    x: 0,
    y: 0,
    z: 0,
    speed: 0,
  }));
  const center = new THREE.Vector3();
  function respawn(d, anywhere) {
    d.x = center.x + (rand() - 0.5) * SPREAD * 2;
    d.z = center.z + (rand() - 0.5) * SPREAD * 2;
    d.y = center.y + (anywhere ? rand() : 1) * HEIGHT;
    d.speed = 13 + rand() * 4;
  }
  const under = (d) =>
    world.roofs.find(
      (roof) =>
        d.x > roof.x0 && d.x < roof.x1 && d.z > roof.z0 && d.z < roof.z1,
    )?.y;

  // Rings spreading on the puddles where drops land and feet splash.
  const rippleMaterial = new THREE.MeshBasicMaterial({
    color: "#f2f7f9",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ripples = Array.from({ length: 48 }, () => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1, 20),
      rippleMaterial.clone(),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    ring.castShadow = false;
    group.add(ring);
    return { ring, age: 1, life: 1, size: 0.3 };
  });
  let nextRipple = 0;
  function ripple(x, y, z, size = 0.35, life = 0.8) {
    const r = ripples[nextRipple];
    nextRipple = (nextRipple + 1) % ripples.length;
    r.ring.position.set(x, y + 0.04, z);
    r.age = 0;
    r.life = life;
    r.size = size;
    r.ring.visible = true;
  }

  const rainbow = createRainbow();
  context.scene.add(rainbow);
  const look = new THREE.Vector3();

  // 1 while it rains, easing to 0 as it clears.
  let wet = 1,
    clearing = false;
  return {
    rainbow,
    get wet() {
      return wet;
    },
    get raining() {
      return wet > 0.5;
    },
    get cleared() {
      return clearing;
    },
    clear() {
      if (clearing) return false;
      clearing = true;
      return true;
    },
    // A splash where a foot comes down in a puddle.
    splash(position, big = false) {
      ripple(
        position.x,
        position.y,
        position.z,
        big ? 1.1 : 0.55,
        big ? 1.2 : 0.9,
      );
      if (big) ripple(position.x, position.y, position.z, 0.6, 0.8);
      context.burst(
        position.clone().add(new THREE.Vector3(0, 0.15, 0)),
        "#cfe4ec",
        big ? 12 : 4,
      );
    },
    animate(dt, camera) {
      if (clearing && wet > 0) {
        wet = Math.max(0, wet - dt / CLEAR_SECONDS);
        context.environment.apply(
          blend(RAIN_ENVIRONMENT, CLEAR_ENVIRONMENT, 1 - wet),
        );
      }
      // Rain falls round the heroine, stopping on roofs and the ground.
      center.copy(context.hero.position);
      const shown = Math.round(DROPS * Math.min(1, wet * 1.4));
      rain.count = shown;
      for (let i = 0; i < shown; i++) {
        const d = drops[i];
        if (d.speed === 0) respawn(d, true);
        d.y -= d.speed * dt;
        d.x += wind * dt;
        if (
          Math.abs(d.x - center.x) > SPREAD ||
          Math.abs(d.z - center.z) > SPREAD
        )
          respawn(d, true);
        const roof = under(d);
        const floor = roof ?? world.heightAt(d.x, d.z);
        if (d.y < floor) {
          if (roof === undefined && i % 3 === 0) {
            const puddle = world.puddleAt(d.x, d.z);
            if (puddle) ripple(d.x, puddle.y, d.z);
          }
          respawn(d, false);
        }
        drop.position.set(d.x, d.y, d.z);
        drop.rotation.set(0, 0, Math.atan2(wind, d.speed));
        drop.updateMatrix();
        rain.setMatrixAt(i, drop.matrix);
      }
      rain.instanceMatrix.needsUpdate = true;
      dropMaterial.opacity = 0.55 * Math.min(1, wet * 1.4);
      for (const r of ripples) {
        if (!r.ring.visible) continue;
        r.age += dt;
        const t = r.age / r.life;
        if (t >= 1) {
          r.ring.visible = false;
          continue;
        }
        r.ring.scale.setScalar(0.05 + r.size * t);
        r.ring.material.opacity = 0.7 * (1 - t);
      }
      // The rainbow stands far off beyond the friends, across from the
      // camera, so it is always in view once the rain has gone.
      const show = 1 - wet;
      rainbow.visible = show > 0.01;
      if (rainbow.visible && camera) {
        look
          .copy(context.hero.position)
          .sub(camera.position)
          .setY(0)
          .normalize();
        rainbow.position
          .copy(context.hero.position)
          .addScaledVector(look, 95)
          .setY(-22);
        rainbow.rotation.set(0, Math.atan2(look.x, look.z) + Math.PI, 0);
        rainbow.material.uniforms.opacity.value =
          0.8 * THREE.MathUtils.smoothstep(show, 0.2, 1);
      }
    },
    hide() {
      rainbow.visible = false;
    },
    reset() {
      wet = 1;
      clearing = false;
      rainbow.visible = false;
      for (const d of drops) d.speed = 0;
      for (const r of ripples) r.ring.visible = false;
    },
  };
}

// One big yellow umbrella that he holds up over the two of them, leaning
// it towards her as they walk.
export function createUmbrella(context) {
  const { companion } = context;
  const umbrella = new THREE.Group();
  umbrella.name = "tea-umbrella";
  const panels = 8,
    radius = 1.75;
  const yellow = new THREE.MeshStandardMaterial({
    color: "#f2c94c",
    roughness: 0.7,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const white = yellow.clone();
  white.color.set("#f4efe2");
  for (let i = 0; i < panels; i++) {
    const panel = new THREE.Mesh(
      new THREE.ConeGeometry(
        radius,
        0.55,
        1,
        1,
        true,
        0,
        (Math.PI * 2) / panels,
      ),
      i % 2 ? white : yellow,
    );
    panel.rotation.y = (i / panels) * Math.PI * 2;
    panel.position.y = 2.55;
    panel.castShadow = true;
    umbrella.add(panel);
  }
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 2.85, 6),
    new THREE.MeshStandardMaterial({ color: "#6b4f3a", roughness: 0.6 }),
  );
  shaft.position.y = 1.4;
  umbrella.add(shaft);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshStandardMaterial({ color: "#c8573f", roughness: 0.6 }),
  );
  tip.position.y = 2.85;
  umbrella.add(tip);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.025, 6, 10, Math.PI),
    shaft.material,
  );
  handle.rotation.z = Math.PI;
  umbrella.add(handle);
  umbrella.visible = false;
  const hand = new THREE.Vector3(),
    her = new THREE.Vector3();
  let open = 0;
  return {
    umbrella,
    // Called after he has walked this frame, so the raised arm sticks.
    update(dt, show) {
      const character = companion.character;
      if (umbrella.parent !== character) character.add(umbrella);
      open += ((show ? 1 : 0) - open) * Math.min(1, dt * 6);
      umbrella.visible = open > 0.05;
      if (!umbrella.visible) return;
      const arm = companion.rig.arms[1];
      arm.rotation.set(-1.15 * open, 0, -0.15 * open);
      arm.updateWorldMatrix(true, false);
      hand.set(0.1, -0.63, 0.03);
      arm.localToWorld(hand);
      character.worldToLocal(hand);
      umbrella.position.copy(hand);
      // Lean it a little towards her, high enough to clear her hood.
      her.copy(context.hero.position);
      character.worldToLocal(her).setY(0);
      if (her.lengthSq() > 1e-6) her.normalize();
      umbrella.rotation.set(0.14 * her.z, 0, -0.14 * her.x);
      umbrella.scale.set(open, 1, open);
    },
    hide() {
      open = 0;
      umbrella.visible = false;
      umbrella.removeFromParent();
    },
  };
}
