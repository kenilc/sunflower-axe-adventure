import * as THREE from "three";

// Render the scene without the HUD. Sheep keepsakes default to 4:3; camera
// mode supplies dimensions matching its live view, including portrait screens.
export function createPhotoCapture({ renderer, scene }) {
  let target;
  return (camera, excluded = [], options = {}) => {
    if (!renderer.readRenderTargetPixels) return null;
    const width = options.width ?? 1024,
      height = options.height ?? 768;
    if (target && (target.width !== width || target.height !== height)) {
      target.dispose();
      target = null;
    }
    target ??= new THREE.WebGLRenderTarget(width, height, { samples: 4 });
    target.texture.colorSpace =
      renderer.outputColorSpace ?? THREE.SRGBColorSpace;
    const previousTarget = renderer.getRenderTarget();
    const visibility = excluded.map((object) => object.visible);
    const pixels = new Uint8Array(width * height * 4);
    try {
      excluded.forEach((object) => {
        object.visible = false;
      });
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    } finally {
      renderer.setRenderTarget(previousTarget);
      excluded.forEach((object, index) => {
        object.visible = visibility[index];
      });
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const picture = context.createImageData(width, height);
    // WebGL reads from the bottom row; image data starts at the top row.
    const stride = width * 4;
    for (let row = 0; row < height; row++)
      picture.data.set(
        pixels.subarray((height - row - 1) * stride, (height - row) * stride),
        row * stride,
      );
    context.putImageData(picture, 0, 0);
    return canvas.toDataURL(options.type ?? "image/png", options.quality);
  };
}
