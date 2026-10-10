import { travelLandmark } from "./travel-landmarks.js";

export function bindTravelMap({ $, journey, canOpen, clearInput, toast }) {
  const dialog = $("#travelMap"),
    trigger = $("#travelAction");
  function render() {
    const destinations = journey.destinations;
    $("#travelSummary").textContent =
      `${destinations.filter((entry) => entry.unlocked).length} of ${destinations.length} places discovered`;
    const byId = new Map(destinations.map((entry) => [entry.id, entry]));
    const paths = $("#journeyPaths");
    paths.replaceChildren();
    for (const destination of destinations) {
      const parent = byId.get(destination.parent);
      if (!parent?.unlocked || !destination.unlocked) continue;
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute(
        "d",
        `M${parent.x * 10} ${parent.y * 10} L${destination.x * 10} ${destination.y * 10}`,
      );
      path.setAttribute("data-from", parent.id);
      path.setAttribute("data-to", destination.id);
      path.setAttribute("data-unlocked", String(destination.unlocked));
      paths.appendChild(path);
    }
    const grid = $("#travelDestinations");
    grid.replaceChildren();
    for (const destination of destinations) {
      if (!destination.unlocked) {
        // Never render an unvisited place's name, landmark, hint or route.
        const fog = document.createElement("span");
        fog.className = "travel-fog";
        fog.style.left = `${destination.x}%`;
        fog.style.top = `${destination.y}%`;
        fog.setAttribute("aria-hidden", "true");
        grid.appendChild(fog);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.value = destination.id;
      button.className = "travel-destination";
      button.style.left = `${destination.x}%`;
      button.style.top = `${destination.y}%`;
      button.disabled = false;
      button.setAttribute("aria-disabled", String(destination.current));
      button.setAttribute("data-unlocked", String(destination.unlocked));
      if (destination.current) button.setAttribute("aria-current", "location");
      const status = destination.current ? "You are here" : "Travel here";
      button.setAttribute(
        "aria-label",
        `${destination.name} · ${status}. ${destination.hint}`,
      );
      const illustration = document.createElement("span");
      illustration.className = "travel-landmark";
      illustration.innerHTML = travelLandmark(destination.id);
      illustration.setAttribute("aria-hidden", "true");
      button.appendChild(illustration);
      button.title = `${destination.name} · ${status}`;
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
