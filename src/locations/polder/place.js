import * as THREE from "three";
import { createPolderWorld } from "./world.js";

const MOMENTS = {
  windmill: "Turned the sails into the wind",
  ducks: "Fed the canal ducks",
};

export function createPolderPlace(context) {
  const world = createPolderWorld(context);
  const memories = new Set();
  function remember(kind, message) {
    const first = !memories.has(kind);
    memories.add(kind);
    context.toast(
      first ? `${message} · ${memories.size} / 2 polder memories` : message,
    );
  }
  function interact() {
    if (world.returnGate.nearby(context.hero.position))
      return context.transitions.go("garden");
    const kind = world.nearby(context.hero.position);
    if (kind === "windmill") {
      world.gust();
      context.burst(
        world.windmillSpot.clone().add(new THREE.Vector3(0, 2.4, 0)),
        "#f4efe2",
        14,
      );
      remember("windmill", "A gust catches the sails · De molen draait! ♥");
      return true;
    }
    if (kind === "ducks") {
      world.feedDucks(context.hero.position.x);
      remember("ducks", "Quack! The ducks paddle over for crumbs ♥");
      return true;
    }
    return false;
  }
  return {
    id: "polder",
    name: "Tulip Polder",
    progressLabel: "Tulip Polder",
    parent: "garden",
    group: world.group,
    terrain: world,
    world,
    canThrow: false,
    maxZoom: 48,
    cameraTarget: () => 1.4,
    canPhotograph: () => true,
    photoLocation: () => "Tulip Polder",
    entrance: { from: "garden", contains: world.entranceGate.contains },
    returnSpawn: [-23, 0, -20],
    settings: {
      spawn: [0, 0, 19],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.36, zoom: 26, fov: 50 },
      // A clear, breezy spring morning with a soft white sun.
      environment: {
        background: "#cfe6f5",
        skyTop: "#8fc3ea",
        fogDensity: 0.004,
        sunIntensity: 2.7,
        sunColor: "#fff6e6",
        sunOffset: [-20, 26, 14],
        fillIntensity: 1.9,
        fillColor: "#dcecff",
        groundColor: "#7a9a5c",
      },
      instructions:
        "<kbd>W A S D</kbd> walk <kbd>X</kbd> windmill / ducks <kbd>M</kbd> photo",
    },
    enter() {
      context.toast(
        "Welkom! ♥ The windmill waits across the canal · Ducks: along the bank",
      );
    },
    exit() {
      world.reset();
    },
    interact,
    getGate: () =>
      world.returnGate.contains(context.hero.position)
        ? { id: "garden" }
        : null,
    animate(dt, time, paused) {
      if (!paused) world.animate(dt);
    },
    afterCamera(dt) {
      if (context.locations.area === "polder")
        world.visibility.update(
          context.camera,
          [context.hero],
          dt,
          context.shouldFadeScenery(),
        );
    },
    getHud() {
      const nearby = world.nearby(context.hero.position);
      const nearGate = world.returnGate.nearby(context.hero.position);
      let label = "Explore the polder · X",
        icon = "interact",
        hint =
          "Tulip strips run north to the canal · Windmill: across the bridge · Ducks: canal bank · Garden: south";
      if (nearGate) {
        label = "Return to garden · X";
        icon = "return";
        hint = "Walk through the signposts to the garden, or press X";
      } else if (nearby === "windmill") {
        label = world.gusting
          ? "The sails are flying · X"
          : "Turn the sails into the wind · X";
        hint =
          "De molen · Lean on the cap together and let the wind take the sails · X";
      } else if (nearby === "ducks") {
        label = "Feed the ducks · X";
        hint = "Eendjes · Scatter a few crumbs from the bank · X";
      }
      return {
        region: "Tulip Polder",
        quest: {
          eyebrow: "A SPRING MORNING IN HOLLAND",
          title: "Tulips in rows.<br />Sails in the wind.",
          objective:
            memories.size === 2
              ? "Two polder memories. Find a photo spot among the tulips, or wander home."
              : "Walk the tulip strips, turn the windmill's sails, and feed the canal ducks.",
        },
        progress: `${memories.size} / 2 polder memories`,
        hint,
        instructions:
          "<kbd>W A S D</kbd> walk <kbd>X</kbd> windmill / ducks <kbd>M</kbd> photo <kbd>V</kbd> map",
        actions: [
          {
            id: "placeAction",
            key: "KeyX",
            icon,
            label,
            visible: nearGate || Boolean(nearby),
            run: interact,
          },
        ],
      };
    },
    getProgress: () => ({
      memories: [...memories],
      totalMemories: Object.keys(MOMENTS).length,
    }),
    reset() {
      memories.clear();
      world.reset();
    },
  };
}
