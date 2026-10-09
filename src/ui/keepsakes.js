import { BEACH_FINDS } from "../systems/keepsakes.js";

function illustration(item) {
  const drawing =
    item.kind === "stone"
      ? `<ellipse cx="80" cy="85" rx="48" ry="31" fill="${item.color}"/><path d="M39 73 Q78 89 120 70" fill="none" stroke="#fff0d8" stroke-width="5"/><ellipse cx="65" cy="68" rx="15" ry="5" fill="#ffffff" opacity=".18"/>`
      : `<path d="M80 109 L32 74 Q20 48 46 38 Q54 20 72 31 Q87 15 101 34 Q125 25 132 50 Q148 65 126 81 Z" fill="${item.color}" stroke="#b48c79" stroke-width="2"/><path d="M80 105 L46 42 M80 105 L62 35 M80 105 L80 31 M80 105 L98 37 M80 105 L118 44 M80 105 L131 62" fill="none" stroke="#fff5e7" stroke-width="3"/><path d="M67 110 Q80 98 94 110" fill="none" stroke="#b48c79" stroke-width="3"/>`;
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140"><ellipse cx="80" cy="117" rx="51" ry="7" fill="#8c6d56" opacity=".12"/>${drawing}</svg>`)}`;
}

export function bindKeepsakes({ $, keepsakes, canOpen, clearInput, toast }) {
  const dialog = $("#keepsakesDialog"),
    trigger = $("#keepsakesAction");
  let filter = "all",
    selected = null;
  function render() {
    const items = keepsakes.items;
    $("#keepsakesSummary").textContent = keepsakes.loadError
      ? "Your collection could not be read. Browser storage may be unavailable."
      : `${items.length} / ${BEACH_FINDS.length} keepsakes · Saved in this browser`;
    for (const kind of ["all", "shell", "stone"])
      $(`#keepsakes-${kind}`).setAttribute(
        "aria-pressed",
        String(kind === filter),
      );
    const shown = items.filter(
      ({ kind }) => filter === "all" || filter === kind,
    );
    $("#keepsakesEmpty").hidden = shown.length > 0;
    $("#keepsakesEmpty").textContent =
      items.length === 0
        ? "An evening by the sea, a little something to keep. Follow the Sunset Beach sign in the southeast garden. Walk up to a glimmer and press X to collect it."
        : "No finds of this kind yet. There are more glimmers to discover along the shore.";
    const grid = $("#keepsakesGrid");
    grid.replaceChildren();
    if (!shown.some(({ id }) => id === selected))
      selected = shown[0]?.id ?? null;
    const item = shown.find(({ id }) => id === selected);
    $("#keepsakesDetail").hidden = !item;
    if (item) {
      $("#keepsakesImage").src = illustration(item);
      $("#keepsakesImage").alt = item.name;
      $("#keepsakesName").textContent = item.name;
      $("#keepsakesDescription").textContent = item.description;
      $("#keepsakesDate").textContent =
        `Found at Sunset Beach · ${new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`;
    }
    for (const entry of shown) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "keepsake-card";
      button.setAttribute("aria-label", `View ${entry.name}`);
      button.setAttribute("aria-pressed", String(selected === entry.id));
      const img = document.createElement("img");
      img.src = illustration(entry);
      img.alt = "";
      const name = document.createElement("span");
      name.textContent = entry.name;
      button.appendChild(img);
      button.appendChild(name);
      button.onclick = () => {
        selected = entry.id;
        render();
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
        "Finish the activity or close the open view before opening Keepsakes.",
      );
      return false;
    }
    clearInput();
    render();
    dialog.showModal();
    return true;
  }
  trigger.onclick = open;
  $("#closeKeepsakes").onclick = close;
  for (const kind of ["all", "shell", "stone"])
    $(`#keepsakes-${kind}`).onclick = () => {
      filter = kind;
      render();
    };
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", clearInput);
  return {
    openCollection: open,
    close,
    get open() {
      return dialog.open;
    },
    keydown(event) {
      if (dialog.open) {
        if (["Escape", "KeyK"].includes(event.code)) {
          event.preventDefault();
          if (!event.repeat) close();
        }
        return true;
      }
      if (
        event.code !== "KeyK" ||
        ["INPUT", "SELECT", "TEXTAREA"].includes(event.target?.tagName)
      )
        return false;
      event.preventDefault();
      if (!event.repeat) open();
      return true;
    },
  };
}
