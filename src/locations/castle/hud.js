export function createCastleHud(context) {
  const { bedRest, castleRoom, hero, state } = context;
  return () => {
    const action = bedRest.resting
      ? { label: "Get up · X" }
      : castleRoom.nearby(hero.position);
    return {
      countsId: "castleCounts",
      actions: [
        {
          id: "castleAction",
          key: "KeyX",
          icon: bedRest.resting ? "return" : undefined,
          label: action?.label ?? "Explore the castle · X",
          visible: Boolean(action),
          disabled: state.castleActivityCooldown > 0,
          run: () => context.interactCastle(),
        },
      ],
      hint: bedRest.resting
        ? "Resting together · X or Get up to return to exploring."
        : "Find six hidden stars. Bed, tea, piano and storybook: X nearby. Exit: pink arch to the south.",
      region: bedRest.resting
        ? "The Cloud Castle · Resting together"
        : "The Cloud Castle · Great Room",
    };
  };
}
