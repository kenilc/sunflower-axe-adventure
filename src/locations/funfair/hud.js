export function createFunfairHud(context) {
  const { funfairActivities: activity } = context;
  return () => {
    const action = activity.nearby();
    return {
      countsId: "funfairCounts",
      actions: [
        {
          id: "funfairAction",
          key: "KeyX",
          icon: activity.riding ? "return" : undefined,
          label: activity.aiming
            ? "Throw ring · X"
            : (action?.label ?? "Explore the funfair · X"),
          visible: Boolean(action),
          disabled:
            activity.throwing ||
            (action?.kind === "toss" && activity.collected === 3),
          run: () => context.interactFunfair(),
        },
        {
          id: "funfairExit",
          key: "Escape",
          label: "Leave booth · Esc",
          icon: "return",
          visible: activity.playing,
          run: () => context.leaveRingToss(),
        },
      ],
      hideStick: activity.playing,
      meter: activity.aiming
        ? { aim: activity.aim, target: activity.target }
        : null,
      hint: activity.playing
        ? "Ring toss · X, Space or click to throw. Leave booth or Esc to return to the park."
        : activity.riding
          ? "Enjoy the ride together · X to finish early. Camera controls still work."
          : "Ferris wheel: northwest. Carousel: northeast. Ring toss: southeast · X nearby. Return gate: south. Festival lantern gate: north.",
      region: activity.riding
        ? activity.ride === "ferris"
          ? "Sunflower Funfair · Ferris wheel"
          : "Sunflower Funfair · Woodland carousel"
        : activity.playing
          ? "Sunflower Funfair · Ring toss"
          : "Sunflower Funfair",
    };
  };
}
