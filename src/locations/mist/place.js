import * as THREE from "three";
import { createPoseHold, sitPose } from "../polder/poses.js";
import { createHouseRooms } from "./rooms.js";
import { createMistWorld } from "./world.js";

const MOMENTS = ["wisps", "houses", "pond", "rest"];

// Dusk in a misty forest: violet sky, thick fog and warm paper lanterns.
export const MIST_ENVIRONMENT = {
  background: "#8d93b8",
  skyTop: "#4d5688",
  fogDensity: 0.022,
  sunIntensity: 1.4,
  sunColor: "#c9c4ff",
  sunOffset: [-14, 26, 10],
  fillIntensity: 2.1,
  fillColor: "#bfc6ee",
  groundColor: "#3c4a5c",
  exposure: 1.15,
};

// The hollow and the four animal houses the friends can walk into.
export function createMistPlaces(context) {
  const world = createMistWorld(context);
  const pose = createPoseHold(context, "mist-log");
  const made = new Set();
  let resting = false,
    restTime = 0;
  function remember(kind, message, repeat = true) {
    if (made.has(kind)) {
      if (repeat) context.toast(message);
      return;
    }
    made.add(kind);
    context.toast(
      `${message} · ${made.size} / ${MOMENTS.length} misty memories`,
    );
  }
  const visited = () => world.houses.filter((house) => house.visited).length;
  // Walking into a house; visiting them all makes a memory.
  function visit(kind, hello) {
    world.houses.find((house) => house.kind === kind).visited = true;
    const count = visited();
    if (count === world.houses.length) remember("houses", hello);
    else
      context.toast(
        `${hello} · ${count} / ${world.houses.length} houses visited`,
      );
  }
  let pendingRoom = null;
  function sitDown() {
    resting = true;
    restTime = 0;
    context.clearRestInput();
    const { log } = world;
    pose.hold((actor, rig, i) => {
      const local = new THREE.Vector3(i ? 0.6 : -0.6, 0.15, 0.1);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), log.rotation.y);
      actor.position.copy(log.position).add(local);
      actor.rotation.set(0, log.rotation.y, 0);
      sitPose(rig, 0.2);
    });
  }
  function standUp() {
    if (!resting) return false;
    resting = false;
    pose.release();
    context.clearRestInput();
    return true;
  }
  function interact() {
    if (resting) return standUp();
    const spot = world.nearby(context.hero.position);
    if (!spot) return false;
    if (spot.kind === "balloon") return world.trip.board();
    if (spot.kind === "wisps") {
      world.gather();
      context.burst(
        context.hero.position.clone().add(new THREE.Vector3(0, 1.6, 0)),
        "#e4e6ff",
        14,
      );
      remember("wisps", "The mist puffs come to say hello and float round you");
      return true;
    }
    if (spot.kind === "pond") {
      world.floatLantern(context.hero.position);
      context.burst(
        context.hero.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
        "#ffd99a",
        10,
      );
      remember("pond", "A paper lantern drifts out across the pond ♥");
      return true;
    }
    if (spot.kind === "rest") {
      sitDown();
      return true;
    }
    return false;
  }
  const mist = {
    id: "mist",
    outfit: "mist",
    name: "Mistwood Hollow",
    progressLabel: "Mistwood Hollow",
    parent: "polder",
    group: world.group,
    terrain: world,
    world,
    canThrow: false,
    maxZoom: 40,
    cameraTarget: () => 1.4,
    canPhotograph: () => true,
    canLeave: () => !resting,
    canSaveLocation: () => !resting && !world.trip.flying,
    cameraLocked: () => resting,
    photoLocation: () =>
      resting ? "Mistwood Hollow · Resting by the pond" : "Mistwood Hollow",
    getPhotoPreset() {
      if (!resting) return;
      return {
        lockActors: true,
        target: world.log.position.clone().setY(1),
        yaw: world.log.rotation.y + Math.PI,
        pitch: 12,
        distance: 7,
        fov: 48,
      };
    },
    // Arrive in the meadow by balloon; it flies back to the polder's canal.
    returnSpawn: [22.6, 0, -11.2],
    settings: {
      spawn: [1.6, 0, 28.6],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.42, zoom: 24, fov: 50 },
      environment: MIST_ENVIRONMENT,
      instructions:
        "<kbd>W A S D</kbd> walk <kbd>X</kbd> mist puffs / houses / pond / log <kbd>M</kbd> photo",
    },
    enter({ from, returning, options = {} } = {}) {
      // Direct links: ?area=mist&activity=village, rest, or a house:
      // frog, cat, rabbit, owl or turtle, which opens on the first frame.
      if (world.houses.some((house) => house.kind === options.activity))
        pendingRoom = `mist:${options.activity}`;
      else if (options.activity === "village" || options.activity === "rest") {
        const spot =
          options.activity === "village"
            ? new THREE.Vector3(0, 0, -6)
            : world.restSpot;
        context.hero.position.set(spot.x, 0, spot.z);
        context.hero.rotation.set(0, Math.PI, 0);
        context.companion.reset(context.hero.position, world.blockers, world);
        if (options.activity === "rest") sitDown();
      }
      const house = world.houses.find(({ kind }) => `mist:${kind}` === from);
      if (house) world.wave(house);
      if (!returning && !pendingRoom)
        context.toast(
          "Shh… the hollow is sleepy ♥ Follow the lanterns north to the little houses",
        );
    },
    exit({ to } = {}) {
      standUp();
      // Stepping into a house keeps the lanterns floating on the pond.
      if (to?.startsWith("mist:")) return;
      world.reset();
    },
    interact,
    moveInstead: (dt) => world.trip.move(dt),
    update(dt) {
      if (pendingRoom) {
        const id = pendingRoom;
        pendingRoom = null;
        context.transitions.jump(id);
        return true;
      }
      if (!resting) return false;
      restTime += dt;
      if (restTime > 3)
        remember(
          "rest",
          "Sitting on the mossy log, watching the mist drift by ♥",
          false,
        );
      return true;
    },
    animate(dt, time, paused) {
      if (!paused) world.animate(dt);
    },
    updateCamera(dt) {
      if (!resting) return false;
      const target = world.log.position.clone().setY(1);
      const behind = new THREE.Vector3(2.4, 2.6, -6.5).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        world.log.rotation.y,
      );
      context.camera.position.lerp(
        target.clone().add(behind),
        1 - Math.exp(-dt * 3),
      );
      context.camera.lookAt(target);
      return true;
    },
    afterCamera(dt) {
      if (context.locations.current === "mist")
        world.visibility.update(
          context.camera,
          [context.hero],
          dt,
          context.shouldFadeScenery(),
        );
    },
    getHud() {
      const spot = resting ? null : world.nearby(context.hero.position);
      let label = "Explore the hollow · X",
        icon = "interact",
        hint =
          "Lantern path: north to the houses, whose doors open · Mist puffs: the glade off the path · Balloon: meadow";
      if (resting) {
        label = "Get up from the log · X";
        icon = "return";
        hint =
          "Lanterns on the water, mist in the trees · X to get up · M for a photo";
      } else if (spot?.kind === "balloon") {
        label = "Fly the balloon back to the polder · X";
        icon = "gate";
        hint = "Climb into the basket and rise out of the mist · X";
      } else if (spot?.kind === "wisps") {
        label = world.gathering
          ? "The mist puffs are floating round you…"
          : "Say hello to the mist puffs · X";
        hint = "Soft little puffs of mist, curious and shy · X";
      } else if (spot?.kind === "pond") {
        label = "Float a paper lantern · X";
        hint = "Set a lantern on the still water · X";
      } else if (spot?.kind === "rest") {
        label = "Sit on the mossy log · X";
        icon = "bench";
        hint = "A quiet seat by the pond · X";
      }
      return {
        region: resting ? "By the pond" : "Mistwood Hollow",
        hideStick: resting,
        quest: {
          eyebrow: "DUSK IN THE MISTY FOREST",
          title: "Lanterns in the fog.<br />Sleepy little houses.",
          objective:
            made.size === MOMENTS.length
              ? "Every misty memory made. Find a photo spot, or fly home by balloon."
              : "Greet the mist puffs, walk into every house, float a lantern and rest on the log.",
        },
        progress: `${made.size} / ${MOMENTS.length} misty memories`,
        hint,
        instructions: resting
          ? "<kbd>X</kbd> get up <kbd>M</kbd> photo"
          : "<kbd>W A S D</kbd> walk <kbd>X</kbd> mist puffs / houses / pond / log <kbd>M</kbd> photo <kbd>V</kbd> map",
        actions: [
          {
            id: resting ? "mistRestStop" : "placeAction",
            key: "KeyX",
            icon,
            label,
            visible:
              resting ||
              (Boolean(spot) && !(spot.kind === "wisps" && world.gathering)),
            run: interact,
          },
        ],
      };
    },
    getProgress: () => ({
      memories: MOMENTS.filter((kind) => made.has(kind)),
      totalMemories: MOMENTS.length,
      housesVisited: visited(),
      resting,
    }),
    reset() {
      standUp();
      made.clear();
      pendingRoom = null;
      world.reset();
    },
  };
  return [mist, ...createHouseRooms(context, { world, visit })];
}
