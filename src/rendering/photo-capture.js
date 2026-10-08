import * as THREE from "three";

// Photograph the scene separately from the exploration view and HUD. Keeping
// a fixed aspect ratio also prevents portrait screens cropping the keepsake.
export function createPhotoCapture({ renderer, scene }) {
  const width = 1024,
    height = 768;
  let target;
  return (camera, excluded = []) => {
    if (!renderer.readRenderTargetPixels) return null;
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
    return canvas.toDataURL("image/png");
  };
}
