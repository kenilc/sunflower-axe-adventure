import * as THREE from "three";

export function createRendering({
  $,
  createRenderer = (options) => new THREE.WebGLRenderer(options),
}) {
  let renderer;
  try {
    renderer = createRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (e) {
    $("#error").hidden = false;
    throw e;
  }
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  $("#game").appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#96c4b0");
  scene.fog = new THREE.FogExp2("#96c4b0", 0.018);
  const camera = new THREE.PerspectiveCamera(
    43,
    innerWidth / innerHeight,
    0.1,
    320,
  );
  scene.add(new THREE.HemisphereLight(0xfff4cf, 0x346457, 2.4));
  const sun = new THREE.DirectionalLight(0xffe6a7, 3.4);
  sun.position.set(-18, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -45,
    right: 45,
    top: 45,
    bottom: -45,
    near: 0.5,
    far: 100,
  });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);
  return { renderer, scene, camera, sun };
}
