import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Parse once; instantiate independent transforms while sharing immutable resources.
export async function loadModels(urls) {
  const loader = new GLTFLoader();
  const entries = await Promise.all(
    Object.entries(urls).map(async ([name, url]) => {
      const gltf = await loader.loadAsync(url);
      const model = gltf.scene.getObjectByName(name);
      if (!model) throw new Error(`Model ${name} has no named root`);
      return [name, model];
    }),
  );
  return Object.fromEntries(entries);
}

export function instantiateModel(template) {
  if (!template)
    throw new Error("Model assets must be loaded before constructing the game");
  const instance = template.clone(true);
  instance.traverse((node) => {
    if (node.userData.initiallyHidden) node.visible = false;
    if (node.isMesh) {
      node.castShadow = node.userData.castShadow ?? true;
      node.receiveShadow = node.userData.receiveShadow ?? true;
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      materials.forEach((material) => {
        material.flatShading = node.userData.flatShading ?? false;
      });
    }
  });
  return instance;
}
