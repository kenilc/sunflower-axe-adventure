import * as THREE from "three";
import { createClogRide } from "./clogs.js";
import { POLDER_ENVIRONMENT } from "./environment.js";
import { createFarmPlace } from "./farm.js";
import { createMillPlaces } from "./mill.js";
import { createPolderWorld } from "./world.js";

// Memories made anywhere in the polder, its farmhouse and its windmill.
const MOMENTS = [
  "windmill",
  "ducks",
  "clogs",
  "table",
  "cheese",
  "flour",
  "stage",
];

function createMemories(context) {
  const made = new Set();
  return {
    has: (kind) => made.has(kind),
    get list() {
      return MOMENTS.filter((kind) => made.has(kind));
    },
    // Each memory is made once; doing it again just shows its message.
    add(kind, message, { repeat = false } = {}) {
      if (made.has(kind)) {
        if (repeat) context.toast(message);
        return false;
      }
      made.add(kind);
      context.toast(
        `${message} · ${made.size} / ${MOMENTS.length} polder memories`,
      );
      return true;
    },
    get progress() {
      return `${made.size} / ${MOMENTS.length} polder memories`;
    },
    get objective() {
      return made.size === MOMENTS.length
        ? "Every polder memory made. Find a photo spot among the tulips, or wander home."
        : "Ride the clogs, turn the sails, feed the ducks, and look inside the farmhouse and the windmill.";
    },
    clear: () => made.clear(),
  };
}

// The polder and the rooms inside it: the farmhouse kitchen, the milling
// floor and the stage around the windmill.
export function createPolderPlaces(context) {
  const world = createPolderWorld(context);
  const memories = createMemories(context);
  const clogs = createClogRide(context, world);
  const rooms = [
    createFarmPlace(context, { world, memories }),
    ...createMillPlaces(context, { world, memories }),
  ];
  let pendingRooms = null;
  function interact() {
    if (clogs.riding) return clogs.stop();
    if (world.returnGate.nearby(context.hero.position))
      return context.transitions.go("garden");
    if (clogs.nearby(context.hero.position)) {
      clogs.start();
      memories.add("clogs", "Into the clogs! Off we trundle ♥", {
        repeat: true,
      });
      return true;
    }
    const kind = world.nearby(context.hero.position);
    if (kind === "windmill") {
      world.gust();
      context.burst(
        world.windmillSpot.clone().add(new THREE.Vector3(0, 2.4, 0)),
        "#f4efe2",
        14,
      );
      memories.add(
        "windmill",
        "A gust catches the sails · De molen draait! ♥",
        {
          repeat: true,
        },
      );
      return true;
    }
    if (kind === "ducks") {
      world.feedDucks(context.hero.position.x);
      memories.add("ducks", "Quack! The ducks paddle over for crumbs ♥", {
        repeat: true,
      });
      return true;
    }
    return false;
  }
  const polder = {
    id: "polder",
    name: "Tulip Polder",
    progressLabel: "Tulip Polder",
    parent: "garden",
    group: world.group,
    terrain: world,
    world,
    clogs,
    memories,
    canThrow: false,
    maxZoom: 48,
    cameraTarget: () => 1.4,
    canPhotograph: () => true,
    canLeave: () => !clogs.riding,
    canSaveLocation: () => !clogs.riding,
    photoLocation: () =>
      clogs.riding ? "Tulip Polder · Riding the clogs" : "Tulip Polder",
    getPhotoPreset() {
      if (!clogs.riding) return;
      return {
        lockActors: true,
        target: context.hero.position.clone().setY(1),
        yaw: context.hero.rotation.y + 0.6,
        pitch: 16,
        distance: 10,
        fov: 48,
      };
    },
    entrance: { from: "garden", contains: world.entranceGate.contains },
    returnSpawn: [-23, 0, -20],
    settings: {
      spawn: [0, 0, 19],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.36, zoom: 26, fov: 50 },
      environment: POLDER_ENVIRONMENT,
      instructions:
        "<kbd>W A S D</kbd> walk <kbd>X</kbd> clogs / windmill / ducks <kbd>M</kbd> photo",
    },
    enter({ returning, options = {} } = {}) {
      // Direct links: ?area=polder&activity=clogs, farm, mill or stage.
      // The rooms open on the first frame, once the polder has settled.
      const rooms = {
        farm: ["polder:farm"],
        mill: ["polder:mill"],
        stage: ["polder:mill", "polder:stage"],
      };
      if (Object.hasOwn(rooms, options.activity))
        pendingRooms = rooms[options.activity];
      else if (options.activity === "clogs") {
        context.hero.position.set(8.8, 0, 24.6);
        context.companion.reset(context.hero.position, world.blockers, world);
        clogs.start();
      } else if (!returning)
        context.toast(
          "Welkom! ♥ Clogs to ride by the gate · Farmhouse and windmill across the canal",
        );
    },
    exit({ to } = {}) {
      // Stepping into the farmhouse or the windmill keeps the wind blowing.
      if (to?.startsWith("polder:")) return;
      clogs.reset();
      world.reset();
    },
    interact,
    moveInstead: (dt) => clogs.move(dt),
    getGate: () =>
      !clogs.riding && world.returnGate.contains(context.hero.position)
        ? { id: "garden" }
        : null,
    update() {
      if (!pendingRooms) return false;
      const route = pendingRooms;
      pendingRooms = null;
      for (const id of route) context.transitions.jump(id);
      return true;
    },
    animate(dt, time, paused) {
      if (!paused) world.animate(dt);
    },
    afterCamera(dt) {
      const here = context.locations.current;
      if (here === "polder" || here === "polder:stage")
        world.visibility.update(
          context.camera,
          [context.hero],
          dt,
          context.shouldFadeScenery(),
        );
    },
    getHud() {
      const position = context.hero.position;
      const nearby = clogs.riding ? null : world.nearby(position);
      const nearGate = !clogs.riding && world.returnGate.nearby(position);
      const nearClogs = !clogs.riding && clogs.nearby(position);
      let label = "Explore the polder · X",
        icon = "interact",
        hint =
          "Clogs: by the gate · Windmill and farmhouse: across the bridge · Ducks: canal bank · Garden: south-west";
      if (clogs.riding) {
        label = "Hop out of the clogs · X";
        icon = "return";
        hint =
          "W A S D to steer · Shift for speed · His clog follows yours · X to hop out · M for a photo";
      } else if (nearGate) {
        label = "Return to garden · X";
        icon = "return";
        hint = "Walk through the signposts to the garden, or press X";
      } else if (nearClogs) {
        label = "Ride the clogs together · X";
        hint =
          "Klompen · Hop in a giant clog each and trundle round the polder · X";
      } else if (nearby === "windmill") {
        label = world.gusting
          ? "The sails are flying · X"
          : "Turn the sails into the wind · X";
        hint =
          "De molen · Lean on the cap together and let the wind take the sails · X · The door leads inside";
      } else if (nearby === "ducks") {
        label = "Feed the ducks · X";
        hint = "Eendjes · Scatter a few crumbs from the bank · X";
      }
      return {
        region: clogs.riding ? "Riding the clogs" : "Tulip Polder",
        quest: {
          eyebrow: "A SPRING MORNING IN HOLLAND",
          title: "Tulips in rows.<br />Sails in the wind.",
          objective: memories.objective,
        },
        progress: memories.progress,
        hint,
        instructions: clogs.riding
          ? "<kbd>W A S D</kbd> steer <kbd>SHIFT</kbd> faster <kbd>X</kbd> hop out <kbd>M</kbd> photo"
          : "<kbd>W A S D</kbd> walk <kbd>X</kbd> clogs / windmill / ducks <kbd>M</kbd> photo <kbd>V</kbd> map",
        actions: [
          {
            id: clogs.riding ? "polderClogsStop" : "placeAction",
            key: "KeyX",
            icon,
            label,
            visible: clogs.riding || nearGate || nearClogs || Boolean(nearby),
            run: interact,
          },
        ],
      };
    },
    getProgress: () => ({
      memories: memories.list,
      totalMemories: MOMENTS.length,
      riding: clogs.riding,
    }),
    reset() {
      memories.clear();
      clogs.reset();
      world.reset();
      for (const room of rooms) room.reset?.();
    },
  };
  return [polder, ...rooms];
}
