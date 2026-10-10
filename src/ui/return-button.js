export const RETURN_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#returnIcon" /></svg>';

const renderedContent = new WeakMap();

export function renderActionButton(button, label, icon) {
  const returning = icon === "return";
  const content = returning ? RETURN_ICON : label;
  button.classList?.toggle("return-button", returning);
  // Browsers serialize SVG differently from its source. Comparing innerHTML
  // would recreate the clicked SVG between pointerdown and pointerup.
  if (renderedContent.get(button) !== content) {
    if (returning) button.innerHTML = RETURN_ICON;
    else button.textContent = label;
    renderedContent.set(button, content);
  }
  button.setAttribute("aria-label", label);
  button.title = label;
}
