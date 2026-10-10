import { expect, test } from "vitest";
import { renderActionButton } from "../src/ui/return-button.js";

test("activity return icons keep their pointer target between frames and update when the action changes", () => {
  let markup = "",
    writes = 0,
    pointerTarget = null,
    pressedTarget;
  const attributes = {};
  const button = {
    classList: { toggle() {} },
    setAttribute(name, value) {
      attributes[name] = value;
    },
    get innerHTML() {
      return markup;
    },
    set innerHTML(value) {
      writes++;
      // Simulate real SVG serialization, which expands the self-closing use.
      markup = value.replace(
        '<use href="#returnIcon" />',
        '<use href="#returnIcon"></use>',
      );
      pointerTarget = {};
    },
    set textContent(value) {
      markup = value;
      pointerTarget = null;
    },
  };
  renderActionButton(button, "Back to beach walk · X", "return");
  pressedTarget = pointerTarget;
  for (let frame = 0; frame < 120; frame++)
    renderActionButton(button, "Back to beach walk · X", "return");
  expect(pointerTarget).toBe(pressedTarget);
  expect(writes).toBe(1);
  renderActionButton(button, "Return to garden · X", "return");
  expect(pointerTarget).toBe(pressedTarget);
  expect(attributes["aria-label"]).toBe("Return to garden · X");
  expect(button.title).toBe("Return to garden · X");
  renderActionButton(button, "Explore tide pool · X");
  expect(markup).toBe("Explore tide pool · X");
  expect(pointerTarget).toBeNull();
  renderActionButton(button, "Back to beach walk · X", "return");
  expect(pointerTarget).not.toBe(pressedTarget);
  expect(writes).toBe(2);
});
