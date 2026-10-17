export function createGardenHud(context) {
  const { hero, heroRig, benchMoment } = context;
  return () => {
    const x = hero.position.x,
      z = hero.position.z,
      nearBeachGate = context.places
        .get("seaside")
        .terrain.entranceGate.nearby(hero.position),
      nearWinterGate = context.places
        .get("winter")
        .terrain.entranceGate.nearby(hero.position),
      nearPolderGate = context.places
        .get("polder")
        .terrain.entranceGate.nearby(hero.position);
    const gate = nearWinterGate
      ? { id: "winter", label: "Visit Lumeküla, Estonia · X" }
      : nearPolderGate
        ? { id: "polder", label: "Visit Tulip Polder · X" }
        : nearBeachGate
          ? { id: "seaside", label: "Visit Sunset Beach · X" }
          : null;
    return {
      instructions: `<kbd>W A S D</kbd> move <kbd>SHIFT</kbd> run ${heroRig.items.canThrow ? "<kbd>CLICK</kbd> throw " : ""}<kbd>DRAG</kbd> look around <kbd>Q E</kbd> rotate <kbd>R / F</kbd> view up / down`,
      countsId: "gardenCounts",
      hint: "Tulip Polder: northwest windmill path · Lumeküla, Estonia: northeast winter path · Sunset Beach: southeast · Cave: north · Alpine village: south · Funfair: east · Riverside: west",
      region:
        Math.hypot(x - 23, z + 25) < 7
          ? "Estonian winter village path"
          : Math.hypot(x + 23, z + 25) < 7
            ? "Tulip Polder path"
            : Math.hypot(x - 23, z - 25) < 7
              ? "Sunset Beach path"
              : z < -38
                ? "Treasure cave entrance"
                : z < -20
                  ? "The sun shrine"
                  : Math.hypot(x - 8, z - 12) < 7
                    ? "Sunflower lake"
                    : x > 16
                      ? "Whispering grove"
                      : x < -16
                        ? "Old garden ruins"
                        : z > 16
                          ? "Wildflower trail"
                          : "Petal clearing",
      actions: [
        {
          key: "KeyX",
          label: gate?.label ?? "Visit Sunset Beach · X",
          icon: "gate",
          visible: Boolean(gate) && !benchMoment.seated,
          run: () => context.transitions.go(gate.id),
        },
        {
          id: "benchAction",
          key: "KeyB",
          label: "Sit & hug · B",
          icon: "bench",
          visible: !benchMoment.seated && benchMoment.nearby(),
          run: () => benchMoment.sit(),
        },
        {
          id: "benchStand",
          key: "KeyB",
          label: "Stand up · B",
          icon: "return",
          visible: benchMoment.seated,
          run: () => benchMoment.stand(),
        },
      ],
    };
  };
}
