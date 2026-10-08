import { createGame } from "./game/create-game.js";

const game = createGame();
game.start();
addEventListener("pagehide", () => game.stop());
addEventListener("pageshow", () => game.start());
