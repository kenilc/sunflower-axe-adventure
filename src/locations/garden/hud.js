export function createGardenHud(context) {
  const { hero, benchMoment } = context;
  return () => {
    const x = hero.position.x,
      z = hero.position.z;
    return {
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
