// Every place's sky, fog and lighting goes through this module. A place
// lists only the values that differ from the garden defaults below, and
// applying an environment always starts again from those defaults, so a
// place never inherits leftover lighting from the place before it.
export const DEFAULT_ENVIRONMENT = Object.freeze({
  background: "#96c4b0",
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

export function createEnvironment({ renderer, scene, sun, fill }) {
  let current = DEFAULT_ENVIRONMENT;
  function apply(overrides = {}) {
    const next = { ...DEFAULT_ENVIRONMENT, ...overrides };
    scene.background.set(next.background);
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
    // A full copy of what is showing now, for restoring it later.
    capture: () => ({ ...current }),
    followTarget,
    get current() {
      return current;
    },
  };
}
