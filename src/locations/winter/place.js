import * as THREE from "three";
import { createWinterWorld } from "./world.js";
import { createWinterActivities, WINTER_LABELS } from "./activities.js";

export function createWinterPlace(context) {
  const world = createWinterWorld(context);
  const activity = createWinterActivities(context, world);
  const rigs = [context.heroRig, context.companion.rig];
  let outfits = [],
    framedActivity = false;
  const busy = () => activity.active;
  function interact() {
    framedActivity = false;
    if (busy())
      return activity.kind === "sauna"
        ? context.transitions.run(() => activity.stop())
        : activity.stop();
    if (world.returnGate.nearby(context.hero.position))
      return context.transitions.go("garden");
    const kind = world.nearby(context.hero.position);
    if (kind === "sauna")
      return context.transitions.run(() => activity.start(kind));
    return kind ? activity.start(kind) : false;
  }
  return {
    id: "winter",
    name: "Lumeküla · Estonian Winter Village",
    progressLabel: "Lumeküla · Estonian Winter Village",
    parent: "garden",
    group: world.group,
    terrain: world,
    world,
    activity,
    canThrow: false,
    maxZoom: 48,
    cameraTarget: () => 1.4,
    cameraLocked: busy,
    canLeave: () => !busy(),
    canSaveLocation: () => !busy(),
    canPhotograph: () => true,
    getPhotoPreset() {
      if (!busy()) return;
      return {
        lockActors: true,
        target: activity.photoTarget,
        yaw:
          activity.kind === "skate"
            ? context.hero.rotation.y + 0.25
            : activity.kind === "snowman"
              ? Math.PI + 0.2
              : 0.2,
        pitch: activity.kind === "sauna" ? 13 : 16,
        distance:
          activity.kind === "snowman" ? 13 : activity.kind === "sauna" ? 9 : 10,
        fov: 48,
      };
    },
    photoLocation: () =>
      busy()
        ? `Lumeküla · ${WINTER_LABELS[activity.kind]}`
        : "Lumeküla · Estonian Winter Village",
    entrance: { from: "garden", contains: world.entranceGate.contains },
    returnSpawn: [23, 0, -20],
    settings: {
      spawn: [0, 0, 18],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.42, zoom: 28, fov: 50 },
      environment: {
        background: "#8faac5",
        fogDensity: 0.005,
        sunIntensity: 1.65,
        fillIntensity: 2.2,
        fillColor: "#d4e7ff",
        groundColor: "#899bad",
      },
      instructions:
        "<kbd>W A S D</kbd> walk <kbd>X</kbd> snowman / skate / cocoa / sauna <kbd>M</kbd> photo",
    },
    enter({ options = {} } = {}) {
      framedActivity = false;
      outfits.forEach((release) => release());
      outfits = rigs.map((rig) =>
        rig.appearance.override({ outfit: "winter" }),
      );
      if (Object.hasOwn(WINTER_LABELS, options.activity)) {
        const spot =
          options.activity === "snowman"
            ? world.snowman.position
            : options.activity === "skate"
              ? world.skateSpot
              : options.activity === "sauna"
                ? world.saunaSpot
                : world.cocoaSpot;
        context.hero.position
          .copy(spot)
          .add(new THREE.Vector3(0, 0, options.activity === "skate" ? 0 : 2.5));
        context.companion.reset(context.hero.position, world.blockers, world);
        activity.start(options.activity);
      } else
        context.toast(
          "Tere tulemast! ♥ Snowman: left · Skating: pond · Cocoa: café · Sauna: northeast hut",
        );
    },
    exit() {
      framedActivity = false;
      activity.stop(false);
      outfits.forEach((release) => release());
      outfits = [];
    },
    interact,
    getGate: () =>
      world.returnGate.contains(context.hero.position)
        ? { id: "garden" }
        : null,
    update(dt) {
      activity.update(dt);
      return busy();
    },
    updateCamera(dt) {
      if (!busy()) {
        framedActivity = false;
        return false;
      }
      const target = activity.photoTarget;
      const yaw =
        activity.kind === "skate"
          ? context.hero.rotation.y + 0.3
          : activity.kind === "snowman"
            ? Math.PI + 0.25
            : 0.2;
      const distance =
        activity.kind === "skate"
          ? 15
          : activity.kind === "snowman"
            ? 13
            : activity.kind === "sauna"
              ? 9
              : 11;
      const position = target
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(yaw) * distance,
            activity.kind === "sauna" ? 2.4 : 4.5,
            Math.cos(yaw) * distance,
          ),
        );
      const delta = context.$("#guide").open ? 0 : dt;
      if (!framedActivity) {
        context.camera.position.copy(position);
        framedActivity = true;
      } else context.camera.position.lerp(position, 1 - Math.exp(-delta * 3));
      context.camera.lookAt(target);
      return true;
    },
    animate(dt, time, paused) {
      if (!paused && activity.kind !== "sauna") world.animate(dt);
    },
    afterCamera(dt) {
      if (context.locations.area === "winter")
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
      let label = "Explore the village · X",
        icon = "interact";
      let hint =
        "Snowman: left · Skating pond: east · Cocoa: yellow café · Sauna hut: northeast · Garden: south";
      if (busy()) {
        label =
          activity.kind === "sauna"
            ? "Step outside sauna · X"
            : "Back to village walk · X";
        icon = "return";
        hint = `${activity.buildStep ?? WINTER_LABELS[activity.kind]}${activity.secondsLeft === null ? "" : ` · ${activity.secondsLeft}s remaining`}${activity.kind === "skate" && !activity.memories.has("skate") ? " · Complete a lap for a memory" : ""} · X to finish · M for a photo`;
        if (activity.kind === "sauna")
          hint =
            "Warm timber, hot stones and gentle steam · B adds water · X steps outside · M takes a photo";
      } else if (nearGate) {
        label = "Return to garden · X";
        icon = "return";
        hint = "Walk through the signposts to the garden, or press X";
      } else if (nearby === "snowman") {
        label =
          world.snowmanStage < 3
            ? world.snowmanStage > 0
              ? "Continue building snowman · X"
              : "Build snowman together · X"
            : "Admire our snowman · X";
        icon = "snowman";
        hint =
          world.snowmanStage < 3
            ? "X starts the full build · Roll, stack and decorate together · X again to stop"
            : "Our snowman is ready · X to admire · B to rebuild";
      } else if (nearby === "skate") {
        label = "Skate together · X";
        icon = "skate";
        hint = "Uisutama! Take a gentle lap together on the village pond · X";
      } else if (nearby === "cocoa") {
        label = "Share warm cocoa · X";
        icon = "tea";
        hint = "Soe kakao · Sit together on the café bench with a warm mug · X";
      } else if (nearby === "sauna") {
        label = "Enter sauna together · X";
        icon = "sauna";
        hint =
          "Saun · Leave the snow outside and warm up together on the wooden bench · X";
      }
      return {
        region: busy() ? WINTER_LABELS[activity.kind] : "Lumeküla · Estonia",
        hideStick: busy(),
        quest: {
          eyebrow: "A SNOWY VILLAGE IN ESTONIA",
          title: "Snow on the rooftops.<br />Warmth for two.",
          objective:
            activity.memories.size === 4
              ? "Four winter memories together. Stay awhile, take a photo, or wander home."
              : "Build a snowman, skate together, share cocoa, and warm up inside the log sauna.",
        },
        progress: `${activity.memories.size} / 4 winter memories · Snowman ${world.snowmanStage} / 3`,
        hint,
        instructions: busy()
          ? "<kbd>X</kbd> back to walk <kbd>M</kbd> photo · A winter moment together"
          : "<kbd>W A S D</kbd> walk <kbd>X</kbd> build / skate / cocoa / sauna <kbd>M</kbd> photo <kbd>V</kbd> map",
        actions: [
          {
            id: "winterSteam",
            key: "KeyB",
            icon: "sauna",
            label: "Add water to hot stones · B",
            visible: activity.kind === "sauna",
            disabled: activity.pouring,
            run: () => activity.pourWater(),
          },
          {
            id: busy() ? "winterStop" : "placeAction",
            key: "KeyX",
            icon,
            label,
            visible: busy() || nearGate || Boolean(nearby),
            run: interact,
          },
          {
            id: "winterRebuild",
            key: "KeyB",
            icon: "rebuild",
            label: "Rebuild snowman · B",
            visible:
              !busy() && nearby === "snowman" && world.snowmanStage === 3,
            run: () => {
              world.resetSnowman();
              context.toast(
                "A fresh patch of snow ♥ X to build another lumememm",
              );
            },
          },
        ],
      };
    },
    getProgress: () => ({
      activity: activity.kind,
      snowmanStage: world.snowmanStage,
      memories: [...activity.memories],
      totalMemories: 4,
    }),
    reset() {
      framedActivity = false;
      activity.reset();
      world.resetSnowman();
      outfits.forEach((release) => release());
      outfits = [];
    },
  };
}
