import * as THREE from "three";
import { createPoseHold, sitPose } from "../polder/poses.js";
import { createLavenderWorld } from "./world.js";

const MOMENTS = ["lavender", "market", "picnic", "bell"];
const GOODS = {
  soap: "A bar of lavender soap, wrapped in paper",
  bread: "A warm loaf for the picnic",
  peaches: "Two ripe peaches, still warm from the sun",
};

// A high-summer noon in Provence: hot stone, cicadas and lavender in rows.
export const LAVENDER_ENVIRONMENT = {
  background: "#f3e3c4",
  skyTop: "#7fb4e0",
  fogDensity: 0.004,
  sunIntensity: 3,
  sunColor: "#fff1d0",
  sunOffset: [-10, 34, 12],
  fillIntensity: 1.8,
  fillColor: "#ffeccc",
  groundColor: "#a99a6a",
};

export function createLavenderPlace(context) {
  const world = createLavenderWorld(context);
  const pose = createPoseHold(context, "lavender-picnic");
  const made = new Set();
  let picnic = false,
    picnicTime = 0;
  function remember(kind, message, repeat = true) {
    if (made.has(kind)) {
      if (repeat) context.toast(message);
      return;
    }
    made.add(kind);
    context.toast(
      `${message} · ${made.size} / ${MOMENTS.length} lavender memories`,
    );
  }
  function sitDown() {
    picnic = true;
    picnicTime = 0;
    context.clearRestInput();
    const ground = world.blanket.position;
    pose.hold((actor, rig, i) => {
      actor.position.set(
        ground.x + (i ? 0.72 : -0.72),
        ground.y - 0.35,
        ground.z,
      );
      actor.rotation.set(0, i ? -0.15 : 0.15, 0);
      sitPose(rig, 0.2);
    });
  }
  function standUp() {
    if (!picnic) return false;
    picnic = false;
    pose.release();
    context.clearRestInput();
    return true;
  }
  function interact() {
    if (picnic) return standUp();
    const spot = world.nearby(context.hero.position);
    if (!spot) return false;
    if (spot.kind === "barge") return world.trip.board();
    if (spot.kind === "balloon") return world.balloonTrip.board();
    if (spot.kind === "lavender") {
      context.hero.rotation.set(
        0,
        context.hero.position.x > 0 ? Math.PI / 2 : -Math.PI / 2,
        0,
      );
      context.burst(
        context.hero.position
          .clone()
          .add(new THREE.Vector3(Math.sign(context.hero.position.x), 1, 0)),
        "#9b77c9",
        16,
      );
      remember("lavender", "An armful of lavender, sweet as summer ♥");
      return true;
    }
    if (spot.kind === "market") {
      world.basket.visible = true;
      remember(
        "market",
        `${GOODS[spot.stall.kind]} · the picnic basket is filling up ♥`,
        false,
      );
      if (made.has("market")) context.toast(GOODS[spot.stall.kind]);
      return true;
    }
    if (spot.kind === "picnic") {
      sitDown();
      return true;
    }
    if (spot.kind === "bell") {
      world.ringBell();
      context.beep(523, 0.6);
      context.burst(new THREE.Vector3(7.5, 11, -27.5), "#f2cf86", 14);
      remember("bell", "Dong… dong… the bell rings over the hills ♥");
      return true;
    }
    return false;
  }
  return {
    id: "lavender",
    outfit: "lavender",
    name: "Lavender Hills",
    progressLabel: "Lavender Hills",
    parent: "polder",
    group: world.group,
    terrain: world,
    world,
    canThrow: false,
    maxZoom: 48,
    cameraTarget: () => 1.4,
    // The follow camera keeps 1.2 above this. High enough that its whole
    // line of sight down to her clears the hill, so it never looks out
    // from under the slope.
    cameraFloor(x, z) {
      const hero = context.hero.position;
      const target = hero.y + 1.2,
        margin = 0.6;
      let floor = world.heightAt(x, z);
      for (let t = 0.05; t < 0.9; t += 0.05) {
        const ground = world.heightAt(
          x + (hero.x - x) * t,
          z + (hero.z - z) * t,
        );
        floor = Math.max(floor, (ground + margin - target * t) / (1 - t));
      }
      return floor - 1.2 + margin;
    },
    canPhotograph: () => true,
    canLeave: () => !picnic,
    canSaveLocation: () =>
      !picnic && !world.trip.sailing && !world.balloonTrip.flying,
    cameraLocked: () => picnic,
    photoLocation: () =>
      picnic ? "Lavender Hills · Picnic under the oak" : "Lavender Hills",
    getPhotoPreset() {
      if (!picnic) return;
      return {
        lockActors: true,
        target: world.blanket.position
          .clone()
          .setY(world.blanket.position.y + 1),
        yaw: 0.35,
        pitch: 14,
        distance: 9,
        fov: 48,
      };
    },
    // Arrive at the quay by barge from the polder; it returns the same way.
    returnSpawn: [25, 0, -12.9],
    settings: {
      spawn: [-5, 0, 23.6],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.34, zoom: 28, fov: 50 },
      environment: LAVENDER_ENVIRONMENT,
      instructions:
        "<kbd>W A S D</kbd> walk <kbd>X</kbd> lavender / market / picnic / bell <kbd>M</kbd> photo",
    },
    enter({ returning, options = {} } = {}) {
      // Direct links: ?area=lavender&activity=village or picnic.
      if (options.activity === "village" || options.activity === "picnic") {
        const spot =
          options.activity === "village"
            ? world.fountainSpot.clone().add(new THREE.Vector3(0, 0, 1.5))
            : world.blanket.position.clone().add(new THREE.Vector3(0, 0, 1.4));
        context.hero.position.set(
          spot.x,
          world.heightAt(spot.x, spot.z),
          spot.z,
        );
        context.companion.reset(context.hero.position, world.blockers, world);
        if (options.activity === "picnic") sitDown();
      }
      if (!returning)
        context.toast(
          "Bienvenue! ♥ Lavender up the hill · The village and its market at the top",
        );
    },
    exit() {
      standUp();
      world.reset();
    },
    interact,
    moveInstead: (dt) => world.trip.move(dt) || world.balloonTrip.move(dt),
    update(dt) {
      if (!picnic) return false;
      picnicTime += dt;
      if (picnicTime > 3)
        remember(
          "picnic",
          world.basket.visible
            ? "Bread, peaches and lavender in the breeze ♥"
            : "A rest in the shade of the oak ♥",
          false,
        );
      return true;
    },
    animate(dt, time, paused) {
      if (!paused) world.animate(dt);
    },
    updateCamera(dt) {
      if (!picnic) return false;
      const target = world.blanket.position
        .clone()
        .setY(world.blanket.position.y + 0.9);
      const position = target.clone().add(new THREE.Vector3(3.2, 3, 8.5));
      context.camera.position.lerp(position, 1 - Math.exp(-dt * 3));
      context.camera.lookAt(target);
      return true;
    },
    afterCamera(dt) {
      if (context.locations.current === "lavender")
        world.visibility.update(
          context.camera,
          [context.hero],
          dt,
          context.shouldFadeScenery(),
        );
    },
    getHud() {
      const spot = picnic ? null : world.nearby(context.hero.position);
      let label = "Explore the hills · X",
        icon = "interact",
        hint =
          "Lavender rows: either side of the path · Village, market and bell tower: hilltop · Barge: quay · Balloon: west hilltop";
      if (picnic) {
        label = "Pack up the picnic · X";
        icon = "return";
        hint =
          "Lavender rows below, cicadas all round · X to get up · M for a photo";
      } else if (spot?.kind === "barge") {
        label = "Take the barge back to the polder · X";
        icon = "gate";
        hint = "Sit at the bow and glide back down the canal · X";
      } else if (spot?.kind === "balloon") {
        label = "Fly the balloon to the misty forest · X";
        icon = "gate";
        hint = "Climb into the basket and float away over the hills · X";
      } else if (spot?.kind === "lavender") {
        label = "Cut lavender together · X";
        hint = "Lavande · Gather an armful from the row · X";
      } else if (spot?.kind === "market") {
        label = `Buy ${spot.stall.kind} · X`;
        hint = "Le marché · Fill the picnic basket · X";
      } else if (spot?.kind === "picnic") {
        label = "Sit down for a picnic · X";
        icon = "bench";
        hint = world.basket.visible
          ? "Under the oak with a full basket · X"
          : "Under the oak · The market up the hill can fill a basket · X";
      } else if (spot?.kind === "bell") {
        label = world.bellRinging
          ? "The bell is ringing…"
          : "Ring the bell · X";
        hint = "Le clocher · Pull the rope together · X";
      }
      return {
        region: picnic ? "Picnic under the oak" : "Lavender Hills",
        hideStick: picnic,
        quest: {
          eyebrow: "A SUMMER NOON IN PROVENCE",
          title: "Lavender in rows.<br />Warm stone and cicadas.",
          objective:
            made.size === MOMENTS.length
              ? "Every lavender memory made. Find a photo spot, take the barge home, or fly the balloon on."
              : "Cut lavender, fill a basket at the market, picnic under the oak, and ring the bell.",
        },
        progress: `${made.size} / ${MOMENTS.length} lavender memories`,
        hint,
        instructions: picnic
          ? "<kbd>X</kbd> get up <kbd>M</kbd> photo"
          : "<kbd>W A S D</kbd> walk <kbd>X</kbd> lavender / market / picnic / bell <kbd>M</kbd> photo <kbd>V</kbd> map",
        actions: [
          {
            id: picnic ? "lavenderPicnicStop" : "placeAction",
            key: "KeyX",
            icon,
            label,
            visible:
              picnic ||
              (Boolean(spot) && !(spot.kind === "bell" && world.bellRinging)),
            run: interact,
          },
        ],
      };
    },
    getProgress: () => ({
      memories: MOMENTS.filter((kind) => made.has(kind)),
      totalMemories: MOMENTS.length,
      picnic,
    }),
    reset() {
      standUp();
      made.clear();
      world.reset();
    },
  };
}
