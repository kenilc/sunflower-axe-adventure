import { createSunsetRest } from "./sunset-rest.js";
import * as THREE from "three";
import { createBeachOutfits } from "./outfits.js";
import { createSeaside } from "./world.js";
import { BEACH_FINDS } from "../../systems/keepsakes.js";
import { createBeachActivity, CASTLE_STAGES } from "./sandcastle.js";

export function createSeasidePlace(context) {
  const { hero, keepsakes, toast } = context;
  const world = createSeaside(context);
  const outfits = createBeachOutfits({
    rigs: [context.heroRig, context.companion.rig],
    helpers: context.helpers,
  });
  const rest = createSunsetRest({
    spot: world.sunsetSpot,
    hero,
    heroRig: context.heroRig,
    companion: context.companion,
    camera: context.camera,
    toast,
    clearInput: context.clearRestInput,
  });
  const activity = createBeachActivity(context);
  const busy = () => rest.seated || activity.active;
  function collect() {
    const find = world.nearest(hero.position);
    if (!find) return;
    try {
      if (!keepsakes.collect(find.id)) return;
      world.sync();
      context.burst(find.model.position.clone(), find.color, 16);
      context.beep(740, 0.2);
      toast(`${find.name} saved · View it in Keepsakes / K`);
    } catch {
      toast(
        "Couldn't save this keepsake. Browser storage may be full or unavailable. Try again.",
      );
    }
  }
  return {
    id: "seaside",
    name: "Sunset Beach",
    progressLabel: "sunset beach",
    parent: "garden",
    group: world.group,
    terrain: world,
    canThrow: false,
    maxZoom: 38,
    rest,
    activity,
    canLeave: () => !busy(),
    canSaveLocation: () => !busy(),
    canPhotograph: () => true,
    getPhotoPreset() {
      if (!busy()) return;
      return {
        lockActors: true,
        target: rest.seated
          ? world.sunsetSpot.group.position
              .clone()
              .add(new THREE.Vector3(0, 0.85, 0))
          : activity.photoTarget,
        yaw: Math.PI + 0.35,
        pitch: rest.seated ? 14 : 18,
        distance: 9,
      };
    },
    photoLocation: () =>
      rest.seated
        ? "Sunset Beach · Sunset for two"
        : activity.active
          ? `Sunset Beach · ${activity.label}`
          : "Sunset Beach",
    cameraLocked: busy,
    update(dt) {
      rest.update(dt);
      activity.update(dt);
      return busy();
    },
    updateCamera(dt) {
      const delta = context.$("#guide").open ? 0 : dt;
      return activity.updateCamera(delta) || rest.updateCamera(delta);
    },
    entrance: {
      from: "garden",
      contains: world.entranceGate.contains,
    },
    returnSpawn: [23, 0, 21],
    settings: {
      spawn: [0, 0, 15],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.27, zoom: 23, fov: 50 },
      environment: {
        background: "#ffd5a1",
        fogDensity: 0.006,
        sunIntensity: 2.1,
        fillIntensity: 2.3,
        fillColor: "#ffe0cc",
        groundColor: "#958395",
      },
    },
    enter({ options = {} } = {}) {
      outfits.set(true);
      world.sync();
      world.shoreLife.resetTracks();
      if (
        options.activity === "sandcastle" ||
        options.activity === "tidepool"
      ) {
        const castle = options.activity === "sandcastle";
        const spot = castle ? world.sandcastle : world.shoreLife.pools[0];
        hero.position.copy(spot.group.position).add({ x: 0, y: 0, z: 3.5 });
        activity.start(castle ? "castle" : "pool", spot);
        world.shoreLife.resetTracks();
        return;
      }
      if (options.activity === "sunset") {
        hero.position
          .copy(world.sunsetSpot.group.position)
          .add({ x: 0, y: 0, z: 2.5 });
        rest.sit();
        return;
      }
      toast(
        "Sunset Beach · Rock pools west, sandcastles in the middle, towels east · X to explore",
      );
    },
    exit() {
      activity.cancel(false);
      rest.stand(false);
      outfits.set(false);
    },
    getGate: () =>
      world.returnGate.contains(hero.position) ? { id: "garden" } : null,
    getHud() {
      const nearby = world.nearest(hero.position),
        count = keepsakes.items.length,
        nearGate = world.returnGate.nearby(hero.position),
        nearTowels = rest.nearby() && !nearby,
        pool = world.shoreLife.nearestPool(hero.position),
        castle = world.sandcastle,
        nearCastle = castle.nearby(hero.position) && !nearby;
      let label = "Collect · X",
        icon = "collect",
        hint =
          "Rock pools: west · Sandcastle: middle · Towels: east · Garden path: south",
        run = collect;
      if (rest.seated) {
        icon = "return";
        label = "Stand up · X";
        hint = "Stay awhile and watch the waves · X to stand up";
        run = () => rest.stand();
      } else if (activity.active) {
        icon = "return";
        label = "Back to beach walk · X";
        hint = `${activity.label}${activity.secondsLeft === null ? "" : ` · ${activity.secondsLeft}s`} · X to stop`;
        run = () => activity.cancel();
      } else if (nearTowels) {
        icon = "sunset";
        label = "Sit & watch sunset · X";
        hint = "Sit together on the towels · X";
        run = () => rest.sit();
      } else if (nearGate) {
        icon = "return";
        label = "Return to garden · X";
        hint = "Walk through the shell arch to the garden, or press X";
        run = () => context.transitions.go("garden");
      } else if (nearby) {
        label = `Collect ${nearby.name} · X`;
        hint = `${nearby.name} nearby · X to collect`;
      } else if (nearCastle) {
        icon = "castle";
        label =
          castle.stage < 3
            ? `${CASTLE_STAGES[castle.stage]} · X`
            : "Admire our castle · X";
        hint =
          castle.stage < 3
            ? `Build together · ${castle.stage} / 3 stages · X`
            : "Our sandcastle is finished · X to admire · B to rebuild";
        run = () => activity.start("castle", castle);
      } else if (pool) {
        icon = "pool";
        label = "Explore tide pool · X";
        hint = "Look closely at the little sea creatures · X";
        run = () => activity.start("pool", pool);
      }
      return {
        region: rest.seated
          ? "A sunset for two"
          : activity.active
            ? activity.label
            : "Sunset Beach",
        hideStick: busy(),
        quest: {
          eyebrow: "AT THE EDGE OF THE SEA",
          title: "The tide rolls in.<br />The day slows down.",
          objective: rest.seated
            ? "A quiet moment together. Watch the sunset, then press X when you are ready to wander."
            : activity.active
              ? `${activity.label} together. X to return to your walk.`
              : "Explore the rock pools, build a sandcastle together, and find a keepsake along the shore.",
        },
        progress: `${count} / ${BEACH_FINDS.length} beach keepsakes${nearCastle || castle.stage ? ` · Castle ${castle.stage} / 3` : ""}`,
        hint,
        instructions: rest.seated
          ? "<kbd>X</kbd> stand up <kbd>M</kbd> photo · Watch the sunset together"
          : activity.active
            ? "<kbd>X</kbd> back to beach walk <kbd>M</kbd> photo"
            : "<kbd>W A S D</kbd> walk <kbd>X</kbd> explore / build / collect / sit <kbd>K</kbd> keepsakes",
        actions: [
          {
            id: rest.seated
              ? "sunsetStand"
              : activity.active
                ? "beachActivityStop"
                : "placeAction",
            key: "KeyX",
            icon,
            label,
            visible:
              busy() ||
              nearTowels ||
              nearGate ||
              Boolean(nearby) ||
              nearCastle ||
              Boolean(pool),
            run,
          },
          {
            id: "sandcastleReset",
            key: "KeyB",
            label: "Rebuild castle · B",
            icon: "rebuild",
            visible: !busy() && nearCastle && castle.stage === 3,
            run: () => {
              castle.reset();
              toast(
                "A fresh patch of sand · X to build another castle together",
              );
            },
          },
        ],
      };
    },
    getProgress: () => ({
      resting: rest.seated,
      beachActivity: activity.active,
      sandcastleStage: world.sandcastle.stage,
      collected: keepsakes.items.length,
      total: BEACH_FINDS.length,
      shells: keepsakes.items.filter(({ kind }) => kind === "shell").length,
      stones: keepsakes.items.filter(({ kind }) => kind === "stone").length,
    }),
    animateBackground: world.animateGates,
    afterCamera(dt) {
      world.landscape.visibility.update(context.camera, [hero], dt);
    },
    animate(dt, time, paused) {
      if (!paused) world.animate(dt);
    },
    reset() {
      activity.cancel(false);
      rest.stand(false);
      world.sandcastle.reset();
      outfits.set(false);
      world.sync();
    },
  };
}
