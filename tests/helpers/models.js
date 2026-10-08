import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function readModels() {
  const loader = new GLTFLoader();
  return Object.fromEntries(
    await Promise.all(
      ["hero", "companion", "axe", "bench"].map(async (name) => {
        const bytes = await readFile(
          new URL(`../../src/assets/models/${name}.glb`, import.meta.url),
        );
        const gltf = await loader.parseAsync(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
          "",
        );
        return [name, gltf.scene.getObjectByName(name)];
      }),
    ),
  );
}
