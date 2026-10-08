// sRGB conversion uses Math.pow, whose last bits can differ between Node
// versions. Keep exported colors stable far beyond visible color precision.
export function stabilizeMaterialColors(root) {
  const materials = new Set();
  root.traverse((node) => {
    if (!node.isMesh) return;
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      if (materials.has(material)) continue;
      materials.add(material);
      for (const color of [material.color, material.emissive]) {
        if (!color) continue;
        for (const channel of ["r", "g", "b"]) {
          color[channel] = Number(color[channel].toFixed(12));
        }
      }
    }
  });
}
