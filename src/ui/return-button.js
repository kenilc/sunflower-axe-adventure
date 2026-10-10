import { actionIcon } from "./action-icons.js";

export const RETURN_ICON = actionIcon("return");

const renderedContent = new WeakMap();

export function renderActionButton(button, label, icon) {
  const returning = icon === "return";
  const content = actionIcon(icon);
  button.classList?.toggle("return-button", returning);
  button.classList?.toggle("action-button", true);
  // Browsers serialize SVG differently from its source. Comparing innerHTML
  // would recreate the clicked SVG between pointerdown and pointerup.
  if (renderedContent.get(button) !== content) {
    button.innerHTML = content;
    renderedContent.set(button, content);
  }
  button.setAttribute("aria-label", label);
  button.title = label;
}
