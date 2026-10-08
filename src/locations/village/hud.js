export function createVillageHud(context) {
  const { state, village, alpineCart, hero } = context;
  return () => {
    const action = alpineCart.riding
      ? { label: "Wheee! Sliding down the mountain…" }
      : village.nearby(hero.position, state.activeVillageShop);
    const trail = village.onTrail(hero.position.x, hero.position.z)
      ? village.trailInfo(hero.position)
      : null;
    return {
      countsId: "villageCounts",
      actions: [
        {
          id: "villageAction",
          key: "KeyX",
          label: action?.label ?? "Explore the village · X",
          visible: Boolean(action),
          disabled: alpineCart.riding || state.villageActivityCooldown > 0,
          run: () => context.interactVillage(),
        },
      ],
      hint: state.activeVillageShop
        ? "Counter: X nearby. Walk out through the open front to return to the street."
        : "Three shops: north side of the street · X. Sheep: eastern meadow. Via ferrata: west path. Return gate: south.",
      region: state.activeVillageShop
        ? state.activeVillageShop.name
        : alpineCart.riding
          ? "Alpine cart · Down the mountain"
          : trail
            ? trail.bridge
              ? "Via Ferrata · Gorge crossing"
              : trail.climbing
                ? "Via Ferrata · Iron-rung ascent"
                : "Via Ferrata · Mountain traverse"
            : hero.position.y > 8
              ? "Via Ferrata · Summit rest"
              : "Edelweiss Village",
    };
  };
}
