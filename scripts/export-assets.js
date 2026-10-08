import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createMeshFactory } from "../src/rendering/mesh-factory.js";
import { createHeroModel } from "../assets/source/hero.js";
import { createCompanionModel } from "../assets/source/companion.js";
import { createBenchModel } from "../assets/source/bench.js";

// The Three.js exporter uses this browser API to assemble GLB buffers.
class BinaryFileReader {
  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((result) => {
        this.result = result;
        this.onloadend?.();
      })
      .catch((error) => this.onerror?.(error));
  }
}
globalThis.FileReader = BinaryFileReader;

function nameRig(root, rig, handIndex) {
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  rig.body.name = "body";
  for (const [index, side] of ["left", "right"].entries()) {
    rig.legs[index].name = `${side}-leg`;
    rig.legs[index].children[1].name = `${side}-foot`;
    rig.arms[index].name = `${side}-arm`;
    rig.arms[index].children[handIndex].name = `${side}-hand`;
  }
  const smile = rig.body.children.find(
    (node) =>
      node.geometry?.type === "TorusGeometry" &&
      node.geometry.parameters.radius === 0.09,
  );
  if (!smile) throw new Error(`${root.name} has no resting smile`);
  smile.name = "rest-smile";
  if (rig.held) rig.held.name = "held-axe";
}

function sharePrimitiveGeometry(root) {
  const geometries = new Map();
  root.traverse((node) => {
    if (
      !node.isMesh ||
      ![
        "BoxGeometry",
        "IcosahedronGeometry",
        "CylinderGeometry",
        "TorusGeometry",
      ].includes(node.geometry.type)
    )
      return;
    const key = JSON.stringify([node.geometry.type, node.geometry.parameters]);
    if (geometries.has(key)) node.geometry = geometries.get(key);
    else geometries.set(key, node.geometry);
  });
}

function preservePresentation(root) {
  root.traverse((node) => {
    if (!node.visible) node.userData.initiallyHidden = true;
    if (node.isMesh) {
      node.userData.castShadow = node.castShadow;
      node.userData.receiveShadow = node.receiveShadow;
      node.userData.flatShading = node.material.flatShading;
    }
  });
}

const scene = new THREE.Scene();
const helpers = createMeshFactory(scene);
const hero = createHeroModel({ scene, ...helpers });
hero.hero.name = "hero";
nameRig(hero.hero, hero, 1);
const companion = createCompanionModel(helpers);
companion.character.name = "companion";
nameRig(companion.character, companion.rig, 3);
const axe = hero.axe();
axe.name = "axe";
const bench = createBenchModel(helpers);
const models = { hero: hero.hero, companion: companion.character, axe, bench };
const directory = fileURLToPath(
  new URL("../src/assets/models/", import.meta.url),
);
const check = process.argv.includes("--check");
if (!check) await mkdir(directory, { recursive: true });
for (const [name, model] of Object.entries(models)) {
  sharePrimitiveGeometry(model);
  preservePresentation(model);
  const data = await new GLTFExporter().parseAsync(model, {
    binary: true,
    onlyVisible: false,
    trs: true,
  });
  const bytes = Buffer.from(data);
  const filename = `${directory}/${name}.glb`;
  if (check) {
    if (!(await readFile(filename)).equals(bytes))
      throw new Error(`${name}.glb is out of date; run npm run assets:build`);
    console.log(`Verified ${name}.glb`);
  } else {
    await writeFile(filename, bytes);
    console.log(`Exported ${name}.glb (${data.byteLength} bytes)`);
  }
}
