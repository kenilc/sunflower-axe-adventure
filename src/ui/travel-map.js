export function bindTravelMap({ $, journey, canOpen, clearInput, toast }) {
  const dialog = $("#travelMap"),
    trigger = $("#travelAction");
  function render() {
    const destinations = journey.destinations;
    $("#travelSummary").textContent =
      `${destinations.filter((entry) => entry.unlocked).length} of ${destinations.length} places discovered`;
    const grid = $("#travelDestinations");
    grid.replaceChildren();
    for (const destination of destinations) {
      const button = document.createElement("button");
      button.type = "button";
      button.value = destination.id;
      button.className = "travel-destination";
      button.style.left = `${destination.x}%`;
      button.style.top = `${destination.y}%`;
      button.disabled = !destination.unlocked || destination.current;
      button.setAttribute("data-unlocked", String(destination.unlocked));
      if (destination.current) button.setAttribute("aria-current", "location");
      const status = destination.current
        ? "You are here"
        : destination.unlocked
          ? "Travel here"
          : "Explore to unlock";
      button.setAttribute(
        "aria-label",
        `${destination.name} · ${status}. ${destination.hint}`,
      );
      for (const [className, text] of [
        ["travel-icon", destination.icon],
        ["travel-name", destination.name],
        ["travel-status", status],
      ]) {
        const label = document.createElement("span");
        label.className = className;
        label.textContent = text;
        if (className === "travel-icon")
          label.setAttribute("aria-hidden", "true");
        button.appendChild(label);
      }
      button.title = destination.hint;
      button.onclick = () => {
        if (journey.travel(destination.id)) close();
      };
      grid.appendChild(button);
    }
  }
  function close() {
    dialog.close();
    clearInput();
    trigger.focus?.();
  }
  function open() {
    if (dialog.open) return true;
    if (!canOpen()) {
      toast(
        "Finish the activity or close the open view before opening the map.",
      );
      return false;
    }
    clearInput();
    render();
    dialog.showModal();
    return true;
  }
  trigger.onclick = open;
  $("#closeTravelMap").onclick = close;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", clearInput);
  return {
    openMap: open,
    close,
    get open() {
      return dialog.open;
    },
    keydown(event) {
      if (dialog.open) {
        if (event.code === "Escape" || event.code === "KeyV") {
          event.preventDefault();
          if (!event.repeat) close();
        }
        return true;
      }
      if (
        event.code !== "KeyV" ||
        ["INPUT", "SELECT", "TEXTAREA"].includes(event.target?.tagName)
      )
        return false;
      event.preventDefault();
      if (!event.repeat) open();
      return true;
    },
  };
}
