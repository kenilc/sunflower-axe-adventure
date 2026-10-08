export function createGardenHud(context) {
  const { hero, heroRig, benchMoment } = context;
  return () => {
    const x = hero.position.x,
      z = hero.position.z;
    return {
      instructions: `<kbd>W A S D</kbd> move <kbd>SHIFT</kbd> run ${heroRig.items.canThrow ? "<kbd>CLICK</kbd> throw " : ""}<kbd>DRAG / Q E</kbd> rotate <kbd>R / F</kbd> view up / down`,
      countsId: "gardenCounts",
      region:
        z < -38
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
          id: "benchAction",
          key: "KeyB",
          label: "Sit & hug · B",
          visible: !benchMoment.seated && benchMoment.nearby(),
          run: () => benchMoment.sit(),
        },
        {
          id: "benchStand",
          key: "KeyB",
          label: "Stand up · B",
          visible: benchMoment.seated,
          run: () => benchMoment.stand(),
        },
      ],
    };
  };
}
