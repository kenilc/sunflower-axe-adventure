import { afterEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createPhotoCapture } from "../src/rendering/photo-capture.js";

afterEach(() => vi.unstubAllGlobals());

test("photos flip WebGL rows and restore the live view and actor visibility, including on failure", () => {
  let picture;
  const canvas = {
    getContext: () => ({
      createImageData: (width, height) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: (data) => {
        picture = data;
      },
    }),
    toDataURL: vi.fn(() => "photo"),
  };
  vi.stubGlobal("document", { createElement: () => canvas });
  const liveTarget = {},
    man = new THREE.Group(),
    hidden = new THREE.Group(),
    scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  hidden.visible = false;
  const renderer = {
    target: liveTarget,
    getRenderTarget() {
      return this.target;
    },
    setRenderTarget(target) {
      this.target = target;
    },
    render: vi.fn(() => {
      expect(man.visible).toBe(false);
      expect(hidden.visible).toBe(false);
    }),
    readRenderTargetPixels(target, x, y, width, height, pixels) {
      pixels.fill(255);
      pixels[0] = 10;
      pixels[(height - 1) * width * 4] = 20;
    },
  };
  const capture = createPhotoCapture({ renderer, scene });
  expect(capture(camera, [man, hidden])).toBe("photo");
  expect(picture.data[0]).toBe(20);
  expect(picture.data[(canvas.height - 1) * canvas.width * 4]).toBe(10);
  expect(canvas.width / canvas.height).toBe(4 / 3);
  expect(man.visible).toBe(true);
  expect(hidden.visible).toBe(false);
  expect(renderer.target).toBe(liveTarget);
  expect(
    capture(camera, [man, hidden], {
      width: 600,
      height: 1000,
      type: "image/jpeg",
      quality: 0.82,
    }),
  ).toBe("photo");
  expect(canvas.width).toBe(600);
  expect(canvas.height).toBe(1000);
  expect(renderer.target).toBe(liveTarget);
  expect(canvas.toDataURL).toHaveBeenLastCalledWith("image/jpeg", 0.82);
  renderer.render.mockImplementation(() => {
    throw new Error("render failed");
  });
  expect(() => capture(camera, [man, hidden])).toThrow("render failed");
  expect(man.visible).toBe(true);
  expect(hidden.visible).toBe(false);
  expect(renderer.target).toBe(liveTarget);
});
