import { createSeaside } from "./world.js";
import { BEACH_FINDS } from "../../systems/keepsakes.js";

export function createSeasidePlace(context) {
  const { hero, keepsakes, toast } = context;
  const world = createSeaside(context);
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
    entrance: {
      from: "garden",
      contains: (p) => Math.hypot(p.x - 23, p.z - 25) < 1.6,
    },
    returnSpawn: [23, 0, 21],
    settings: {
      spawn: [0, 0, 15],
      heading: Math.PI,
      camera: { yaw: 0, pitch: 0.27, zoom: 23, fov: 50 },
      environment: {
        background: "#e89a94",
        fogDensity: 0.0025,
        sunIntensity: 2.1,
        fillIntensity: 2.3,
        fillColor: "#ffe0cc",
        groundColor: "#958395",
      },
    },
    enter() {
      world.sync();
      toast(
        "Sunset Beach · Walk together, find a little keepsake. X to collect · K to view.",
      );
    },
    getGate: () =>
      hero.position.z > 22 && Math.abs(hero.position.x) < 2
        ? { id: "garden" }
        : null,
    getHud() {
      const nearby = world.nearest(hero.position),
        count = keepsakes.items.length;
      return {
        region: "Sunset Beach",
        quest: {
          eyebrow: "AT THE EDGE OF THE SEA",
          title: "The tide rolls in.<br />The day slows down.",
          objective:
            count === BEACH_FINDS.length
              ? "All twelve keepsakes saved. Enjoy the sunset together."
              : "Wander the shore together. Collect shells and smooth stones to remember this evening.",
        },
        progress: `${count} / ${BEACH_FINDS.length} beach keepsakes`,
        hint: nearby
          ? `${nearby.name} nearby · X to collect`
          : "Look for tiny glimmers in the sand · Keepsakes / K · Garden path: south",
        instructions:
          "<kbd>W A S D</kbd> walk <kbd>X</kbd> collect <kbd>K</kbd> keepsakes <kbd>M</kbd> camera",
        actions: [
          {
            key: "KeyX",
            label: nearby ? `Collect ${nearby.name} · X` : "Collect · X",
            visible: Boolean(nearby),
            run: collect,
          },
        ],
      };
    },
    getProgress: () => ({
      collected: keepsakes.items.length,
      total: BEACH_FINDS.length,
      shells: keepsakes.items.filter(({ kind }) => kind === "shell").length,
      stones: keepsakes.items.filter(({ kind }) => kind === "stone").length,
    }),
    animate(dt, time, paused) {
      if (!paused) world.animate(time);
    },
    reset: world.sync,
  };
}
