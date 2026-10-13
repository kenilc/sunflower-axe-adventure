import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

// Light sources (lanterns, lit windows, lamps, fireworks) join this layer to
// glow. They still render normally on the default layer.
export const GLOW_LAYER = 1;
const glowing = new Set();

export function markGlow(...objects) {
  for (const object of objects)
    object.traverse((node) => {
      if (!node.isMesh && !node.isLine && !node.isPoints) return;
      node.layers.enable(GLOW_LAYER);
      glowing.add(node);
    });
}

// Whether a glowing object is showing in this scene right now.
function showing(scene) {
  for (const node of glowing) {
    let shown = true,
      root = node;
    for (; root.parent; root = root.parent)
      if (!root.visible) {
        shown = false;
        break;
      }
    if (shown && root === scene && root.visible) return true;
  }
  return false;
}

const blurShader = {
  uniforms: {
    source: { value: null },
    direction: { value: new THREE.Vector2() },
  },
  vertexShader:
    "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  // A 9-tap Gaussian along one axis; `direction` is one texel step.
  fragmentShader: `
    uniform sampler2D source;
    uniform vec2 direction;
    varying vec2 vUv;
    void main() {
      vec4 sum = texture2D(source, vUv) * 0.2270270270;
      sum += texture2D(source, vUv + direction * 1.3846153846) * 0.3162162162;
      sum += texture2D(source, vUv - direction * 1.3846153846) * 0.3162162162;
      sum += texture2D(source, vUv + direction * 3.2307692308) * 0.0702702703;
      sum += texture2D(source, vUv - direction * 3.2307692308) * 0.0702702703;
      gl_FragColor = sum;
    }`,
};

// A soft glow added over the finished frame. The normal render is untouched:
// only GLOW_LAYER objects are drawn again (at half size), blurred, and added
// on top. Drawing the whole scene again just so walls could hide the glow
// nearly doubled the frame time, so a light behind something can bleed a
// faint halo around its edges. On phones and the test renderer it does
// nothing.
export function createGlow({
  renderer,
  strength = 1.1,
  enabled = renderer.isWebGLRenderer === true &&
    !globalThis.matchMedia?.("(pointer: coarse)").matches,
}) {
  if (!enabled) return { enabled: false, render() {} };
  const options = { type: THREE.HalfFloatType };
  const glow = new THREE.WebGLRenderTarget(1, 1, options);
  const blurA = new THREE.WebGLRenderTarget(1, 1, options);
  const blurB = new THREE.WebGLRenderTarget(1, 1, options);
  const blur = new THREE.ShaderMaterial({
    ...blurShader,
    uniforms: THREE.UniformsUtils.clone(blurShader.uniforms),
    depthTest: false,
    depthWrite: false,
  });
  const add = new THREE.ShaderMaterial({
    uniforms: { source: { value: null }, strength: { value: strength } },
    vertexShader: blurShader.vertexShader,
    fragmentShader:
      "uniform sampler2D source; uniform float strength; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(source, vUv).rgb * strength, 1.0); }",
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const quad = new FullScreenQuad(blur);
  const mask = new THREE.Layers();
  const clearColor = new THREE.Color();
  function setSize(width, height) {
    const ratio = renderer.getPixelRatio();
    const fit = (value, divisor) =>
      Math.max(1, Math.round((value * ratio) / divisor));
    glow.setSize(fit(width, 2), fit(height, 2));
    for (const target of [blurA, blurB])
      target.setSize(fit(width, 4), fit(height, 4));
  }
  function pass(material, source, target) {
    quad.material = material;
    material.uniforms.source.value = source.texture;
    renderer.setRenderTarget(target);
    quad.render(renderer);
  }
  function blurStep(from, to, x, y) {
    blur.uniforms.direction.value.set(x / from.width, y / from.height);
    pass(blur, from, to);
  }
  const size = new THREE.Vector2(),
    drawn = new THREE.Vector2();
  return {
    enabled: true,
    // Call right after the frame has been drawn to the screen. Follows the
    // renderer's size, which Camera mode changes.
    render(scene, camera) {
      if (!showing(scene)) return;
      if (!renderer.getSize(size).equals(drawn)) {
        drawn.copy(size);
        setSize(size.x, size.y);
      }
      const background = scene.background,
        autoUpdate = scene.matrixWorldAutoUpdate,
        autoClear = renderer.autoClear,
        shadows = renderer.shadowMap.autoUpdate,
        alpha = renderer.getClearAlpha();
      renderer.getClearColor(clearColor);
      mask.mask = camera.layers.mask;
      renderer.setClearColor(0x000000, 1);
      // Shadows and world matrices are already up to date for this frame.
      renderer.shadowMap.autoUpdate = false;
      scene.matrixWorldAutoUpdate = false;
      scene.background = null;
      renderer.setRenderTarget(glow);
      renderer.clear();
      camera.layers.set(GLOW_LAYER);
      renderer.render(scene, camera);
      camera.layers.mask = mask.mask;
      scene.background = background;
      scene.matrixWorldAutoUpdate = autoUpdate;
      // Blur at quarter size, twice for a wider, softer halo.
      renderer.autoClear = false;
      blurStep(glow, blurA, 1, 0);
      blurStep(blurA, blurB, 0, 1);
      blurStep(blurB, blurA, 2, 0);
      blurStep(blurA, blurB, 0, 2);
      pass(add, blurB, null);
      renderer.setClearColor(clearColor, alpha);
      renderer.autoClear = autoClear;
      renderer.shadowMap.autoUpdate = shadows;
    },
  };
}
