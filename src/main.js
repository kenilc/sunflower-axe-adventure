import { createGame } from "./game/create-game.js";
import { loadModels } from "./assets/models.js";
import { modelUrls } from "./assets/urls.js";

async function start() {
  const status = document.querySelector("#loading");
  try {
    const models = await loadModels(modelUrls);
    const game = createGame({ models });
    game.start();
    status.hidden = true;
    addEventListener("pagehide", () => game.stop());
    addEventListener("pageshow", () => game.start());
  } catch (error) {
    console.error(error);
    if (!document.querySelector("#error").hidden) status.hidden = true;
    else
      status.textContent =
        "The adventure could not load. Reload the page to try again.";
  }
}
void start();
