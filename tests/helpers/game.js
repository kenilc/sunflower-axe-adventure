import { vi } from "vitest";
import { readModels } from "./models.js";

export async function createTestGame({ storage } = {}) {
  const elements = new Map();
  const handlers = new Map();
  const element = (selector) => {
    if (!elements.has(selector))
      elements.set(selector, {
        style: {},
        value: "0",
        children: [],
        replaceChildren() {
          this.children = [];
        },
        showModal() {
          this.open = true;
        },
        close() {
          this.open = false;
        },
        firstChild: { textContent: "" },
        open: false,
        attributes: {},
        classList: { toggle() {} },
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
        appendChild(child) {
          this.children.push(child);
        },
        addEventListener() {},
      });
    return elements.get(selector);
  };
  const browser = {
    console,
    setTimeout(fn) {
      fn();
    },
    performance: { now: () => 0 },
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    window: {},
    localStorage: storage ?? {
      getItem: () => null,
      setItem() {},
    },
    requestAnimationFrame() {},
    cancelAnimationFrame() {},
    addEventListener(name, callback) {
      handlers.set(name, callback);
    },
    document: {
      querySelector: element,
      createElementNS(namespace, tag) {
        return this.createElement(tag);
      },
      createElement() {
        return {
          style: {},
          attributes: {},
          children: [],
          setAttribute(name, value) {
            this.attributes[name] = value;
          },
          appendChild(child) {
            this.children.push(child);
          },
          width: 0,
          height: 0,
          getContext() {
            return {
              fillRect() {},
              fillText() {},
              createImageData(width, height) {
                return { data: new Uint8ClampedArray(width * height * 4) };
              },
              putImageData() {},
            };
          },
          toDataURL: () => "data:image/png;base64,d29vbGx5",
        };
      },
      addEventListener(name, callback) {
        handlers.set(name, callback);
      },
      body: { classList: { toggle() {} } },
    },
    FakeRenderer: class {
      constructor() {
        this.domElement = element("canvas");
        this.shadowMap = {};
      }
      setSize() {}
      setPixelRatio() {}
      getRenderTarget() {
        return this.target ?? null;
      }
      setRenderTarget(target) {
        this.target = target;
      }
      readRenderTargetPixels(target, x, y, width, height, pixels) {
        pixels.fill(255);
      }
      render(scene, camera) {
        if (this.target) return;
        this.scene = scene;
        this.camera = camera;
      }
    },
  };
  for (const [name, value] of Object.entries(browser))
    vi.stubGlobal(name, value);
  element(".quest .eyebrow").textContent = "THE SUNKEN GARDEN";
  element(".quest h1").innerHTML = "A little wander.<br />A mighty axe.";
  element("#objective").textContent =
    "Break the wooden targets and find the sunstones.";
  const { createGame } = await import("../../src/game/create-game.js");
  const models = await readModels();
  const G = createGame({
    models,
    createRenderer: () => new browser.FakeRenderer(),
  });
  G.update();
  return { game: G, models, element, handlers, elements };
}
