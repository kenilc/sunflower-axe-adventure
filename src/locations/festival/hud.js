export function createFestivalHud(context) {
  const { festivalMoment: moment, festival, hero } = context;
  return () => ({
    actions: [
      {
        id: "festivalAction",
        key: "KeyX",
        icon: moment.active ? "return" : "fireworks",
        label: moment.active
          ? "Keep exploring · X"
          : "Watch fireworks together · X",
        visible: moment.active || festival.nearBridge(hero.position),
        run: () => context.interactFestival(),
      },
    ],
    hint: moment.active
      ? "A happy moment on the bridge ♥ · X to keep exploring."
      : "Bridge: center of the river · X to watch together. Tea house: northwest. Firefly gardens: northeast. Return gate: south. Festival lantern gate: north.",
    region: moment.active
      ? "Summer Festival · Fireworks for two"
      : "Japanese Summer Festival",
  });
}
