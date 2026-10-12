import * as THREE from "three";
import { createEnvironment } from "./environment.js";

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
  $("#game").appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.FogExp2(0xffffff, 0);
  const camera = new THREE.PerspectiveCamera(
    43,
    innerWidth / innerHeight,
    0.1,
    320,
  );
  const fill = new THREE.HemisphereLight();
  scene.add(fill);
  const sun = new THREE.DirectionalLight();
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
  const environment = createEnvironment({ renderer, scene, sun, fill });
  environment.followTarget(new THREE.Vector3());
  return { renderer, scene, camera, sun, fill, environment };
}
