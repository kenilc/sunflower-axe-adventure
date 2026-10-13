import * as THREE from "three";

// A soft dark patch under each actor's feet, so they sit on the ground even
// where the sun's shadow falls away from them or is too faint to read.
export function createContactShadows({
  scene,
  actors,
  radius = 1,
  strength = 0.42,
}) {
  const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Paths and decks sit a few centimetres above the ground; draw over them.
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    uniforms: { strength: { value: strength } },
    vertexShader:
      "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform float strength; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.0, 0.0, 0.0, strength * (1.0 - smoothstep(0.15, 1.0, d))); }",
  });
  const shadows = actors.map(() => {
    const shadow = new THREE.Mesh(geometry, material);
    shadow.name = "contact-shadow";
    shadow.renderOrder = 1;
    shadow.castShadow = shadow.receiveShadow = false;
    scene.add(shadow);
    return shadow;
  });
  function shown(node) {
    for (; node; node = node.parent) if (!node.visible) return false;
    return true;
  }
  const position = new THREE.Vector3();
  return {
    shadows,
    // Follow each actor's feet; hide the patch while the actor is hidden.
    update() {
      actors.forEach((actor, i) => {
        const shadow = shadows[i];
        shadow.visible = shown(actor);
        if (!shadow.visible) return;
        actor.getWorldPosition(position);
        shadow.position.set(position.x, position.y + 0.07, position.z);
      });
    },
  };
}
