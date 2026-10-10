import { createSunsetRest } from "./sunset-rest.js";
import { createBeachOutfits } from "./outfits.js";
import { createSeaside } from "./world.js";
import { BEACH_FINDS } from "../../systems/keepsakes.js";

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
    canLeave: () => !rest.seated,
    canSaveLocation: () => !rest.seated,
    cameraLocked: () => rest.seated,
    update(dt) {
      rest.update(dt);
      return rest.seated;
    },
    updateCamera(dt) {
      return rest.updateCamera(context.$("#guide").open ? 0 : dt);
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
      if (options.activity === "sunset") {
        hero.position
          .copy(world.sunsetSpot.group.position)
          .add({ x: 0, y: 0, z: 2.5 });
        rest.sit();
        return;
      }
      toast(
        "Sunset Beach · Walk together, find a little keepsake. X to collect · K to view.",
      );
    },
    exit() {
      rest.stand(false);
      outfits.set(false);
    },
    getGate: () =>
      world.returnGate.contains(hero.position) ? { id: "garden" } : null,
    getHud() {
      const nearby = world.nearest(hero.position),
        count = keepsakes.items.length,
        nearGate = world.returnGate.nearby(hero.position),
        nearTowels = rest.nearby() && !nearby;
      return {
        region: rest.seated ? "A sunset for two" : "Sunset Beach",
        hideStick: rest.seated,
        quest: {
          eyebrow: "AT THE EDGE OF THE SEA",
          title: "The tide rolls in.<br />The day slows down.",
          objective: rest.seated
            ? "A quiet moment together. Watch the sunset, then press X when you are ready to wander."
            : count === BEACH_FINDS.length
              ? "All twelve keepsakes saved. Enjoy the sunset together."
              : "Wander the shore together. Collect shells and smooth stones to remember this evening.",
        },
        progress: `${count} / ${BEACH_FINDS.length} beach keepsakes`,
        hint: rest.seated
          ? "Stay awhile and watch the waves · X to stand up"
          : nearTowels
            ? "Sit together on the towels · X"
            : nearGate
              ? "Walk through the shell arch to the garden, or press X"
              : nearby
                ? `${nearby.name} nearby · X to collect`
                : "Sun umbrella & towels: southeast shore · X to sit · Garden path: south",
        instructions: rest.seated
          ? "<kbd>X</kbd> stand up · Watch the sunset together"
          : "<kbd>W A S D</kbd> walk <kbd>X</kbd> collect / sit <kbd>K</kbd> keepsakes <kbd>M</kbd> camera",
        actions: [
          {
            id: rest.seated ? "sunsetStand" : "placeAction",
            key: "KeyX",
            label: rest.seated
              ? "Stand up · X"
              : nearTowels
                ? "Sit & watch sunset · X"
                : nearGate
                  ? "Return to garden · X"
                  : nearby
                    ? `Collect ${nearby.name} · X`
                    : "Collect · X",
            visible: rest.seated || nearTowels || nearGate || Boolean(nearby),
            run: () =>
              rest.seated
                ? rest.stand()
                : nearTowels
                  ? rest.sit()
                  : nearGate
                    ? context.transitions.go("garden")
                    : collect(),
          },
        ],
      };
    },
    getProgress: () => ({
      resting: rest.seated,
      collected: keepsakes.items.length,
      total: BEACH_FINDS.length,
      shells: keepsakes.items.filter(({ kind }) => kind === "shell").length,
      stones: keepsakes.items.filter(({ kind }) => kind === "stone").length,
    }),
    animateBackground: world.animateGates,
    animate(dt, time, paused) {
      if (!paused) world.animate(dt);
    },
    reset() {
      rest.stand(false);
      outfits.set(false);
      world.sync();
    },
  };
}
