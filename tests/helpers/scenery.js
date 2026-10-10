import { expect } from "vitest";
import { isVisibilityManaged } from "../../src/rendering/tree-visibility.js";

export function expectSolidScenery(scene, label) {
  const faded = [];
  function inspect(node) {
    if (!node.visible) return;
    if (node.isMesh && isVisibilityManaged(node)) {
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      if (materials.some((material) => material.opacity !== 1))
        faded.push(node.name || node.uuid);
    }
    node.children.forEach(inspect);
  }
  inspect(scene);
  expect(faded, `${label}: activity scenery keeps its natural opacity`).toEqual(
    [],
  );
}
