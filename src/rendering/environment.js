import * as THREE from "three";

// Every place's sky, fog and lighting goes through this module. A place
// lists only the values that differ from the garden defaults below, and
// applying an environment always starts again from those defaults, so a
// place never inherits leftover lighting from the place before it.
export const DEFAULT_ENVIRONMENT = Object.freeze({
  // The horizon colour, which fog fades into.
  background: "#96c4b0",
  // Colour at the top of the sky. The sky blends from background up to it;
  // null leaves a flat background (rooms, caves).
  skyTop: "#5d9fc4",
  fogDensity: 0.018,
  sunIntensity: 3.4,
  sunColor: "#ffe6a7",
  // Sun position relative to the heroine. The shadow camera follows her.
  sunOffset: Object.freeze([-18, 30, 12]),
  fillIntensity: 2.4,
  fillColor: "#fff4cf",
  groundColor: "#346457",
  exposure: 1.2,
});

// A dome drawn behind everything, at the far plane, wherever the camera is.
function createSkyDome() {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        horizon: { value: new THREE.Color() },
        top: { value: new THREE.Color() },
      },
      vertexShader:
        "varying vec3 direction; void main() { direction = position; vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = clip.xyww; }",
      fragmentShader:
        "uniform vec3 horizon; uniform vec3 top; varying vec3 direction; void main() { float h = max(normalize(direction).y, 0.0); gl_FragColor = vec4(mix(horizon, top, smoothstep(0.0, 0.42, h)), 1.0);\n#include <colorspace_fragment>\n }",
    }),
  );
  dome.name = "sky-dome";
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  dome.castShadow = dome.receiveShadow = false;
  return dome;
}

export function createEnvironment({ renderer, scene, sun, fill }) {
  let current = DEFAULT_ENVIRONMENT;
  const sky = createSkyDome();
  scene.add(sky);
  function apply(overrides = {}) {
    const next = { ...DEFAULT_ENVIRONMENT, ...overrides };
    scene.background.set(next.background);
    sky.visible = Boolean(next.skyTop);
    sky.material.uniforms.horizon.value.set(next.background);
    if (next.skyTop) sky.material.uniforms.top.value.set(next.skyTop);
    scene.fog.color.copy(scene.background);
    scene.fog.density = next.fogDensity;
    sun.intensity = next.sunIntensity;
    sun.color.set(next.sunColor);
    fill.intensity = next.fillIntensity;
    fill.color.set(next.fillColor);
    fill.groundColor.set(next.groundColor);
    renderer.toneMappingExposure = next.exposure;
    current = Object.freeze(next);
    return current;
  }
  function followTarget(position) {
    const [x, y, z] = current.sunOffset;
    sun.position.set(position.x + x, position.y + y, position.z + z);
    sun.target.position.copy(position);
  }
  apply();
  return {
    apply,
    sky,
    // A full copy of what is showing now, for restoring it later.
    capture: () => ({ ...current }),
    followTarget,
    get current() {
      return current;
    },
  };
}
