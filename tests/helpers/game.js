import { vi } from "vitest";
import { readModels } from "./models.js";

export async function createTestGame() {
  const elements = new Map();
  const handlers = new Map();
  const element = (selector) => {
    if (!elements.has(selector))
      elements.set(selector, {
        style: {},
        firstChild: { textContent: "" },
        open: false,
        setAttribute() {},
        appendChild() {},
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
    requestAnimationFrame() {},
    cancelAnimationFrame() {},
    addEventListener(name, callback) {
      handlers.set(name, callback);
    },
    document: {
      querySelector: element,
      createElement() {
        return {
          width: 0,
          height: 0,
          getContext() {
            return { fillRect() {}, fillText() {} };
          },
        };
      },
      addEventListener() {},
      body: { classList: { toggle() {} } },
    },
    FakeRenderer: class {
      constructor() {
        this.domElement = element("canvas");
        this.shadowMap = {};
      }
      setSize() {}
      setPixelRatio() {}
      render(scene, camera) {
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
